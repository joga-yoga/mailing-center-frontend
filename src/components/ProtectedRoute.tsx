import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';
import { LoginPage } from '../pages/Login';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected route component that checks authentication before rendering children
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  if (!isAuthenticated()) {
    return <LoginPage />;
  }

  return <>{children}</>;
};



