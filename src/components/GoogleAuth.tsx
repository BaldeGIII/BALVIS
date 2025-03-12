import React, { useEffect, useState } from "react";

interface User {
  name: string;
  email: string;
  picture: string;
}

interface AuthStatus {
  authenticated: boolean;
  user?: User;
}

const GoogleAuth: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    authenticated: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication status when component mounts
    const checkAuthStatus = async () => {
      try {
        const response = await fetch("http://localhost:5000/auth/status", {
          credentials: "include", // Important for cookies/sessions
        });
        const data = await response.json();
        setAuthStatus(data);
      } catch (error) {
        console.error("Error checking auth status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Checking login...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {authStatus.authenticated ? (
        <div className="flex items-center gap-2">
          {authStatus.user?.picture && (
            <img
              src={authStatus.user.picture}
              alt={authStatus.user.name || "User"}
              className="w-8 h-8 rounded-full"
            />
          )}
          <div className="text-sm">
            <div className="font-medium text-gray-800 dark:text-white">
              {authStatus.user?.name}
            </div>
            <a
              href="http://localhost:5000/auth/logout"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              onClick={(e) => {
                // Adding this ensures cookies are sent with the request
                e.preventDefault();
                window.location.href = "http://localhost:5000/auth/logout";
              }}
            >
              Sign out
            </a>
          </div>
        </div>
      ) : (
        <a
          href="http://localhost:5000/auth/google"
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Sign in with Google
        </a>
      )}
    </div>
  );
};

export default GoogleAuth;
