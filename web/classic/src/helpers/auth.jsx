/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Loading from '../components/common/ui/Loading';
import { UserContext } from '../context/User';
import { API, updateAPI } from './api';

export function authHeader() {
  // return authorization header with jwt token
  let user = JSON.parse(localStorage.getItem('user'));

  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    return {};
  }
}

export const AuthRedirect = ({ children }) => {
  const user = localStorage.getItem('user');

  if (user) {
    return <Navigate to='/console' replace />;
  }

  return children;
};

function readStoredUser() {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    localStorage.removeItem('user');
    return null;
  }
}

function isAdminUser(user) {
  return user && typeof user.role === 'number' && user.role >= 10;
}

function useSessionUser() {
  const [userState, userDispatch] = useContext(UserContext);
  const [user, setUser] = useState(() => userState?.user || readStoredUser());
  const [loading, setLoading] = useState(
    () => !userState?.user && !readStoredUser(),
  );

  useEffect(() => {
    const existingUser = userState?.user || readStoredUser();
    if (existingUser) {
      setUser(existingUser);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    const loadSessionUser = async () => {
      try {
        const res = await API.query('self', {}, { skipErrorHandler: true });
        const { success, data } = res.data;
        if (!success || !data) {
          throw new Error('session not authenticated');
        }
        if (cancelled) return;
        localStorage.setItem('user', JSON.stringify(data));
        userDispatch({ type: 'login', payload: data });
        updateAPI();
        setUser(data);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        localStorage.removeItem('user');
        userDispatch({ type: 'logout' });
        updateAPI();
        setUser(null);
        setLoading(false);
      }
    };

    loadSessionUser();

    return () => {
      cancelled = true;
    };
  }, [userDispatch, userState?.user]);

  return { user, loading };
}

function PrivateRoute({ children }) {
  const location = useLocation();
  const { user, loading } = useSessionUser();

  if (loading) {
    return <Loading />;
  }
  if (!user) {
    return <Navigate to='/login' state={{ from: location }} />;
  }
  return children;
}

export function AdminRoute({ children }) {
  const location = useLocation();
  const { user, loading } = useSessionUser();

  if (loading) {
    return <Loading />;
  }
  if (!user) {
    return <Navigate to='/login' state={{ from: location }} />;
  }
  if (isAdminUser(user)) {
    return children;
  }
  return <Navigate to='/forbidden' replace />;
}

export { PrivateRoute };
