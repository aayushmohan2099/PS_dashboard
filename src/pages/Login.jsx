// src/pages/Login.jsx
import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { AuthContext } from "../contexts/AuthContext";
import RoleSelector from "../components/auth/RoleSelector";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import LoadingModal from "../components/ui/LoadingModal";
import { getUser } from "../utils/storage";
import psLogo from "../assets/PS_lolo.png"; 

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
  <div className="login-page">

    <LoadingModal
      open={loading}
      title={loading ? "Logging in" : "Please wait"}
      message={loading ? "Logging in — verifying credentials" : ""}
    />

    {/* BACKGROUND */}
    <div className="login-bg-image" />

    <div className="overlay">
      <form className="login-form" onSubmit={handleSubmit(onSubmit)}>

        {/* LOGO HEADER */}
        <div className="logo-header">
          <img src={psLogo} alt="Pragati Setu" />
        </div>

        <div className="con">

          {/* USER TYPE */}
          <label className="block-label">User Type</label>
          <div className="radio-row">
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
              /> Admin
            </label>

            <label>
              <input
                type="radio"
                value="General"
                {...register("userType")}
                onChange={() => {
                  setUserType("General");
                  setValue("userType", "General");
                  setRole("");
                }}
              /> General
            </label>
          </div>
          {errors.userType && <div className="error">{errors.userType.message}</div>}

          {/* ROLE */}
          <label className="block-label">Role</label>
          <RoleSelector
            userType={userType}
            value={role}
            onChange={(v) => setRole(v)}
          />
          {errors.role && <div className="error">{errors.role.message}</div>}

          {/* USERNAME */}
          <label className="block-label">Username</label>
          <input
            className="form-input"
            placeholder="Enter username"
            {...register("username")}
          />
          {errors.username && <div className="error">{errors.username.message}</div>}

          {/* PASSWORD */}
          <label className="block-label">Password</label>
          <input
            className="form-input"
            type="password"
            placeholder="Enter password"
            {...register("password")}
          />
          {errors.password && <div className="error">{errors.password.message}</div>}

          {/* SUBMIT */}
          <button className="log-in" type="submit">Log In</button>

          {/* FORGOT */}
          <div className="other">
            <button
              type="button"
              className="frgt-pass"
              onClick={() => alert("Forgot password flow placeholder")}
            >
              Forgot Password?
            </button>
          </div>

        </div>
      </form>
    </div>

    {/* ===== UI STYLES ONLY ===== */}
    <style>{`
      .login-page {
        min-height: 100vh;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Abel', sans-serif;
        background: #0f172a;
      }

      /* BACKGROUND IMAGE */
      .login-bg-image {
        position: absolute;
        inset: 0;
        background-image: url("/assets/login_bg.jpg"); /* 🔁 replace with actual bg */
        background-size: cover;
        background-position: center;
        filter: brightness(0.55);
        z-index: 0;
      }

      .overlay {
        z-index: 2;
        width: 100%;
        display: flex;
        justify-content: center;
      }

      .login-form {
        width: 460px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 12px;
        padding: 36px 32px;
        box-shadow: 0 30px 80px rgba(0,0,0,0.45);
        color: #0f172a;
      }

      .logo-header {
        display: flex;
        justify-content: center;
        margin-bottom: 24px;
      }

      .logo-header img {
        height:90px;
        object-fit: contain;
      }

      .con {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .block-label {
        font-size: 14px;
        font-weight: 600;
        margin-top: 6px;
        color: #0f172a;
      }

      .radio-row {
        display: flex;
        gap: 18px;
        font-size: 14px;
      }

      .form-input {
        height: 46px;
        padding: 0 14px;
        border-radius: 6px;
        border: 1px solid #cbd5f5;
        font-size: 14px;
        color: #0f172a;
        background: #ffffff;
      }

      .form-input::placeholder {
        color: #64748b;
      }

      .log-in {
        margin-top: 18px;
        height: 48px;
        background: #0f172a;
        color: #ffffff;
        font-weight: 700;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.25s ease;
      }

      .log-in:hover {
        background: #1e293b;
        transform: translateY(1px);
      }

      .other {
        text-align: center;
        margin-top: 12px;
      }

      .frgt-pass {
        background: transparent;
        color: #2563eb;
        font-size: 13px;
        cursor: pointer;
      }

      .frgt-pass:hover {
        text-decoration: underline;
      }

      .error {
        font-size: 12px;
        color: #dc2626;
      }

      @media (max-width: 520px) {
        .login-form {
          width: 92%;
        }
      }
    `}</style>
  </div>
);


}
