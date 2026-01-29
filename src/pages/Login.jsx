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

import {
  FaDatabase,
  FaChalkboardTeacher,
  FaMapMarkedAlt,
  FaSeedling,
} from "react-icons/fa";

import psLogo from "../assets/PS_lolo.png";
import bmsLogo from "../assets/bms_logo.png";
import tmsLogo from "../assets/tms_logo.png";
import ldmsLogo from "../assets/ldms_logo.png";
import esmLogo from "../assets/ems_logo.png";

/* -------------------------------------------------
   ROLE → ROUTES
-------------------------------------------------- */
const ROLE_TMS_ROUTE = {
  bmmu: "/tms/bmmu/dashboard",
  dmmu: "/tms/dmmu/dashboard",
  smmu: "/tms/smmu/dashboard",
  training_partner: "/tms/tp/dashboard",
  master_trainer: "/tms/mt/dashboard",
  tp_contact_person: "/tms/cp/dashboard",
  default: "/tms",
};

const ROLE_LDMS_ROUTE = {
  bmmu: "/ldms/bmmu/dashboard",
  dmmu: "/ldms/dmmu/dashboard",
  smmu: "/ldms/smmu/dashboard",
  default: "/ldms",
};

/* -------------------------------------------------
   ROLE ID MAP
-------------------------------------------------- */
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
  module: yup.string().required("Select module"),
  userType: yup.string().required("Select user type"),
  role: yup.string().required("Select role"),
  username: yup.string().required("Enter username"),
  password: yup.string().required("Enter password"),
});

export default function Login() {
  const { login, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [module, setModule] = useState("bms");
  const [theme, setTheme] = useState("blue");

  const [userType, setUserType] = useState("Admin");
  const [role, setRole] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { module: "bms", userType: "Admin", role: "" },
  });

  useEffect(() => setValue("module", module), [module, setValue]);
  useEffect(() => setValue("userType", userType), [userType, setValue]);
  useEffect(() => setValue("role", role), [role, setValue]);

  const onSubmit = async (data) => {
    const result = await login(data);
    if (!result?.success) {
      alert("Login failed");
      return;
    }

    const backendUser = getUser();
    const backendRoleKey = ROLE_ID_TO_KEY[Number(backendUser.role_id)];

    if (backendRoleKey !== data.role) {
      alert("Role mismatch");
      return;
    }

    if (
      (data.userType === "Admin" && !ADMIN_ROLE_KEYS.has(backendRoleKey)) ||
      (data.userType === "General" && !GENERAL_ROLE_KEYS.has(backendRoleKey))
    ) {
      alert("User type mismatch");
      return;
    }

    if (data.module === "bms") navigate("/dashboard");
    if (data.module === "tms")
      navigate(ROLE_TMS_ROUTE[backendRoleKey] || ROLE_TMS_ROUTE.default);
    if (data.module === "ldms")
      navigate(ROLE_LDMS_ROUTE[backendRoleKey] || ROLE_LDMS_ROUTE.default);
    if (data.module === "esm") alert("EMS dashboard coming soon");
  };

  return (
    <div className={`login-page theme-${theme}`}>
      <LoadingModal open={loading} title="Logging in" />

      <div className="overlay">
        <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="logo-header">
            <img src={psLogo} alt="Pragati Setu" />
          </div>

          {/* MODULE SELECTOR */}
          <div className="module-row">
            <div
              className="module-card blue"
              onMouseEnter={() => setTheme("blue")}
              onClick={() => setModule("bms")}
            >
              <img src={bmsLogo} />
              <span>BMS</span>
            </div>

            <div
              className="module-card yellow"
              onMouseEnter={() => setTheme("yellow")}
              onClick={() => setModule("tms")}
            >
              <img src={tmsLogo} />
              <span>TMS</span>
            </div>

            <div
              className="module-card red"
              onMouseEnter={() => setTheme("red")}
              onClick={() => setModule("ldms")}
            >
              <img src={ldmsLogo} />
              <span>LDMS</span>
            </div>

            <div
              className="module-card green"
              onMouseEnter={() => setTheme("green")}
              onClick={() => setModule("esm")}
            >
              <img src={esmLogo} />
              <span>EMS</span>
            </div>
          </div>

          {/* USER TYPE */}
          <label className="block-label">User Type</label>
          <div className="radio-row">
            <label>
              <input
                type="radio"
                value="Admin"
                {...register("userType")}
                defaultChecked
                onChange={() => {
                  setUserType("Admin");
                  setRole("");
                }}
              />{" "}
              Admin
            </label>
            <label>
              <input
                type="radio"
                value="General"
                {...register("userType")}
                onChange={() => {
                  setUserType("General");
                  setRole("");
                }}
              />{" "}
              General
            </label>
          </div>

          <label className="block-label">Role</label>
          <RoleSelector userType={userType} value={role} onChange={setRole} />

          <label className="block-label">Username</label>
          <input className="form-input" {...register("username")} />

          <label className="block-label">Password</label>
          <input
            className="form-input"
            type="password"
            {...register("password")}
          />

          <button className="log-in" type="submit">
            Log In
          </button>
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
        width: 100%;
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
        height: 38px;
        background: #0f172a;
        color: #ffffff;
        font-weight: 700;
        justify-content: center;
        display: flex;
        align-items: center;
        width: 100%;
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
        
      .module-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 18px;
      }

      .module-card {
        border-radius: 10px;
        padding: 12px 6px;
        text-align: center;
        justify-content: center;
        align-items: center;
        display: flex;
        flex-direction: column;
        cursor: pointer;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        transition: all 0.25s ease;

        /* --- FONT POLISH --- */
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.4px;
        color: #0f172a;

        /* soft text depth (real alternative to font-shading) */
        text-shadow: 0 1px 1px rgba(0,0,0,0.08);
      }

      .module-card img {
        height: 32px;
        margin-bottom: 4px;
      }

      .module-card svg {
        font-size: 18px;
        margin-bottom: 2px;
      }

      .module-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        text-shadow: 0 2px 4px rgba(0,0,0,0.15);
      }

      /* ---- THEME BACKGROUND SWITCH ---- */
      .theme-blue.login-page {
        background: linear-gradient(135deg, #1e3a8a, #0f172a);
      }

      .theme-yellow.login-page {
        background: linear-gradient(135deg, #f59e0b, #78350f);
      }

      .theme-red.login-page {
        background: linear-gradient(135deg, #991b1b, #450a0a);
      }

      .theme-green.login-page {
        background: linear-gradient(135deg, #166534, #052e16);
      }
      .theme-blue .log-in { background: #2563eb; }
      .theme-yellow .log-in { background: #f59e0b; }
      .theme-red .log-in { background: #b91c1c; }
      .theme-green .log-in { background: #15803d; }
      
      @media (max-width: 520px) {
        .login-form {
          width: 92%;
        }
      }
    `}</style>
    </div>
  );
}
