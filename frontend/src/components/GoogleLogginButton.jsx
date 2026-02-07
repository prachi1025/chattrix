export default function GoogleLoginButton() {
	const handleGoogleLogin = () => {
		window.location.href = import.meta.env.VITE_BACKEND_URL + "/api/auth/google"
	}

	return (
		<button
			className='btn btn-outline btn-primary w-full'
			onClick={handleGoogleLogin}>
			Sign in with Google
		</button>
	)
}
