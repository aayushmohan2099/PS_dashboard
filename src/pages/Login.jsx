// src/pages/Login.jsx
import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { AuthContext } from "../contexts/AuthContext";
import RoleSelector from "../components/auth/RoleSelector";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import LoadingModal from "../components/ui/LoadingModal";
import { getUser } from "../utils/storage"; // ✅ CORRECT IMPORT

/**
 * Backend role_id → frontend role key mapping
 * MUST stay in sync with backend roles table
 */
const ROLE_ID_TO_KEY = {
  1: "bmmu",
  2: "dmmu",
  3: "smmu",
  4: "training_partner",
  5: "crp_ld",
  6: "crp_ep",
  7: "master_trainer",
  8: "state_admin",
  9: "pmu_admin",
  10: "dcnrlm",
  11: "tp_contact_person",
};

const ADMIN_ROLE_KEYS = new Set([
  "state_admin",
  "bmmu",
  "dmmu",
  "dcnrlm",
  "smmu",
  "pmu_admin",
]);

const GENERAL_ROLE_KEYS = new Set([
  "training_partner",
  "master_trainer",
  "crp_ep",
  "crp_ld",
  "tp_contact_person",
]);

const schema = yup.object({
  userType: yup.string().required("Select user type"),
  role: yup.string().required("Select role"),
  username: yup.string().required("Enter username"),
  password: yup.string().required("Enter password"),
});

export default function Login() {
  const { login, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [userType, setUserType] = useState("Admin");
  const [role, setRole] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { userType: "Admin", role: "" },
  });

  useEffect(() => {
    setValue("userType", userType);
  }, [userType, setValue]);

  useEffect(() => {
    setValue("role", role);
  }, [role, setValue]);

  const onSubmit = async (data) => {
    const {
      username,
      password,
      role: selectedRole,
      userType: selectedUserType,
    } = data;

    const result = await login({ username, password });

    if (!result?.success) {
      const msg =
        result?.error?.detail || result?.error?.message || "Login failed";
      alert(msg);
      return;
    }

    /**
     * ✅ USER MUST BE READ FROM STORAGE
     * (set by setAuth() in AuthContext)
     */
    const backendUser = getUser();

    if (!backendUser) {
      alert("Login failed: User session not initialized.");
      console.error("User missing in localStorage");
      return;
    }

    const backendRoleId = Number(backendUser.role_id ?? backendUser.role);
    const backendRoleKey = ROLE_ID_TO_KEY[backendRoleId];

    if (!backendRoleKey) {
      alert("Login failed: Invalid role assigned.");
      console.error("Unknown role_id:", backendRoleId);
      return;
    }

    // 1️⃣ Role mismatch check
    if (backendRoleKey !== selectedRole) {
      alert(
        `Role mismatch.\n\nSelected: ${selectedRole}\nAssigned: ${backendRoleKey}`
      );
      return;
    }

    // 2️⃣ Admin vs General mismatch check
    if (
      (selectedUserType === "Admin" && !ADMIN_ROLE_KEYS.has(backendRoleKey)) ||
      (selectedUserType === "General" && !GENERAL_ROLE_KEYS.has(backendRoleKey))
    ) {
      alert(
        `User type mismatch.\n\nSelected: ${selectedUserType}\nAssigned Role: ${backendRoleKey}`
      );
      return;
    }

    // ✅ SUCCESS
    setTimeout(() => navigate("/dashboard"), 400);
  };

  return (
    <div className="page-container">
      <LoadingModal
        open={loading}
        title={loading ? "Logging in" : "Please wait"}
        message={loading ? "Logging in — verifying credentials" : ""}
      />

      <h1>Pragati Setu — Login</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <label>User Type</label>
        <div>
          <label>
            <input
              type="radio"
              value="Admin"
              {...register("userType")}
              onChange={() => {
                setUserType("Admin");
                setValue("userType", "Admin");
                setRole("");
              }}
              defaultChecked
            />
            Admin
          </label>

          <label style={{ marginLeft: 12 }}>
            <input
              type="radio"
              value="General"
              {...register("userType")}
              onChange={() => {
                setUserType("General");
                setValue("userType", "General");
                setRole("");
              }}
            />
            General User
          </label>
        </div>
        {errors.userType && (
          <div className="error">{errors.userType.message}</div>
        )}

        <label>Role</label>
        <RoleSelector
          userType={userType}
          value={role}
          onChange={(v) => setRole(v)}
        />
        {errors.role && <div className="error">{errors.role.message}</div>}

        <div className="form-row">
          <label>Username</label>
          <input {...register("username")} />
          {errors.username && (
            <div className="error">{errors.username.message}</div>
          )}
        </div>

        <div className="form-row">
          <label>Password</label>
          <input type="password" {...register("password")} />
          {errors.password && (
            <div className="error">{errors.password.message}</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="submit">Login</button>
          <button
            type="button"
            className="secondary"
            onClick={() => alert("Forgot password flow placeholder")}
          >
            Forgot Password
          </button>
        </div>
      </form>
    </div>
  );
}
