import { useState } from "react";
import { User } from "./types";
import { LoginPage } from "./components/LoginPage";
import { StudentDashboard } from "./components/StudentDashboard";
import { TeacherDashboard } from "./components/TeacherDashboard";
import { AdminDashboard } from "./components/AdminDashboard";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(
    null,
  );

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (currentUser.role === "student") {
    return (
      <StudentDashboard
        user={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  if (currentUser.role === "teacher") {
    return (
      <TeacherDashboard
        user={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  if (currentUser.role === "admin") {
    return (
      <AdminDashboard
        user={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  return <LoginPage onLogin={handleLogin} />;
}