import { create } from "zustand"
import { axiosInstance } from "../lib/axios.js"
import toast from "react-hot-toast";
import { io } from "socket.io-client"

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set,get) => ({
    authUser: null,
    isCheckingAuth: true,
    isSignUp: false,
    isLoginIn: false,
    isUpdatingProfile: false,
    isChangingPassword: false,
    onlineUsers: [], 
    socket: null,

    checkAuth: async () => {
        try {
            const res = await axiosInstance.get("/auth/check", { withCredentials: true });
            set({ authUser: res.data });

            if (res.data) get().connectSocket(); // connect socket on page refresh
        } catch (error) {
            set({ authUser: null });
            console.log(error.response.message.data)
        } finally {
            set({ isCheckingAuth: false });
        }
    },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

    login: async (data) => {
        set({ isLoginIn: true });
        try {
            const res = await axiosInstance.post("/auth/login", data);
            set({ authUser: res.data });
            toast.success("Logged in successfully");
            get().connectSocket(); // connect socket after login
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            set({ isLoginIn: false });
        }
    },

    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout");
            set({ authUser: null });
            toast.success("Logged out successfully");
            get().disconnectSocket();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    },

    connectSocket: () => {
        const { authUser } = get();
        if (!authUser) return;
        if (get().socket?.connected) return;

        const socket = io(BASE_URL, { query: { userId: authUser._id } });
        set({ socket });

        socket.on("connect", () => console.log("Socket connected:", socket.id));
        socket.on("disconnect", () => console.log("Socket disconnected"));

        socket.on("getOnlineUsers", (userIds) => set({ onlineUsers: userIds }));
    },

    disconnectSocket: () => {
        const socket = get().socket;
        if (socket?.connected) socket.disconnect();
        set({ socket: null });
    },
}));
