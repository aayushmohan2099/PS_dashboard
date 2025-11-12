// src/pages/Login.jsx
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../contexts/AuthContext';
import RoleSelector from '../components/auth/RoleSelector';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object({
  userType: yup.string().required('Select user type'),
  role: yup.string().required('Select role'),
  username: yup.string().required('Enter username'),
  password: yup.string().required('Enter password'),
});

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [userType, setUserType] = useState('Admin');
  const [role, setRole] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { userType: 'Admin', role: '' }
  });

  useEffect(() => {
    setValue('userType', userType);
  }, [userType]);

  useEffect(() => {
    setValue('role', role);
  }, [role, setValue]);

  const onSubmit = async (data) => {
    const { username, password } = data;
    const result = await login({ username, password });
    if (result.success) {
      navigate('/dashboard');
    } else {
      const msg = result.error?.detail || (result.error?.message) || 'Login failed';
      alert(msg);
      console.error('Login error', result.error);
    }
  };

  return (
    <div className="page-container">
      <h1>Pragati Setu — Login</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <label>User Type</label>
        <div>
          <label>
            <input type="radio" value="Admin" {...register('userType')} onChange={() => { setUserType('Admin'); setValue('userType','Admin'); }} defaultChecked />
            Admin
          </label>
          <label style={{marginLeft:12}}>
            <input type="radio" value="General" {...register('userType')} onChange={() => { setUserType('General'); setValue('userType','General'); }} />
            General User
          </label>
        </div>
        {errors.userType && <div className="error">{errors.userType.message}</div>}

        <label>Role</label>
        <RoleSelector userType={userType} value={role} onChange={(v)=> setRole(v)} />
        {errors.role && <div className="error">{errors.role.message}</div>}

        <div className="form-row">
          <label>Username</label>
          <input {...register('username')} />
          {errors.username && <div className="error">{errors.username.message}</div>}
        </div>

        <div className="form-row">
          <label>Password</label>
          <input type="password" {...register('password')} />
          {errors.password && <div className="error">{errors.password.message}</div>}
        </div>

        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button type="submit">Login</button>
          <button type="button" className="secondary" onClick={() => alert('Forgot password flow placeholder')}>Forgot Password</button>
        </div>
      </form>
    </div>
  );
}
