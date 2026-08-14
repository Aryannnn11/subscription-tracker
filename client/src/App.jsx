import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AddSubscription from "./pages/AddSubscription";
import EditSubscription from "./pages/EditSubscription";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/add-subscription"
        element={
          <ProtectedRoute>
            <AddSubscription />
          </ProtectedRoute>
        }
      />

      <Route
        path="/edit-subscription/:id"
        element={
          <ProtectedRoute>
            <EditSubscription />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;