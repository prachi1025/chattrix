import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import cors from "cors"
import passport from "passport"
import jwt from "jsonwebtoken"
import { Strategy as GoogleStrategy } from "passport-google-oauth20"

import path from "path"

import authRoutes from "./routes/auth.route.js"
import messageRoutes from "./routes/message.route.js"
import { connectDB } from "./lib/db.js"
import User from "./models/user.model.js" // <-- user model import

import { app, server } from "./lib/socket.js"
dotenv.config()

const PORT = process.env.PORT || 5001
const __dirname = path.resolve()

// ========== PASSPORT GOOGLE STRATEGY ==========
passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: process.env.GOOGLE_CALLBACK_URL, //
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				const email = profile.emails[0].value
				const googleId = profile.id
				const fullName = profile.displayName
				const profilePic = profile.photos[0].value

				// Check if user exists
				let user = await User.findOne({ email })

				if (!user) {
					// Create new user
					user = await User.create({
						fullName,
						email,
						profilePic,
						googleId,
					})
				}

				return done(null, user)
			} catch (err) {
				return done(err, null)
			}
		},
	),
)

// ========== MIDDLEWARE ==========
app.use(express.json({ limit: "10mb" }))
app.use(cookieParser())
app.use(
	cors({
		origin: "http://localhost:5173",
		credentials: true,
	}),
)
app.use(passport.initialize())

// ========== GOOGLE AUTH ROUTES ==========

// Step 1: Start Google login
app.get(
	"/api/auth/google",
	passport.authenticate("google", { scope: ["profile", "email"] }),
)

// Step 2: Google callback
app.get(
	"/api/auth/google/callback",
	passport.authenticate("google", {
		failureRedirect: "http://localhost:5173/",
		session: false,
	}),
	(req, res) => {
		// Generate JWT token
		const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, {
			expiresIn: "7d",
		})

		// Store JWT in cookie
		res.cookie("jwt", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		})

		// Redirect to dashboard
		res.redirect("http://localhost:5173/")
	},
)

// ========== OTHER ROUTES ==========
app.use("/api/auth", authRoutes)
app.use("/api/messages", messageRoutes)

// ========== SERVE STATIC FILES ==========
if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "../frontend/dist")))

	app.get("(.*)", (req, res) => {
		res.sendFile(path.join(__dirname, "../frontend/dist/index.html"))
	})
}

// ========== START SERVER ==========
server.listen(PORT, () => {
	console.log(`✅ Server running on port ${PORT}`)
	connectDB()
})
