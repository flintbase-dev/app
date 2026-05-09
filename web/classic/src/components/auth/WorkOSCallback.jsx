import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loading from '../common/ui/Loading';
import { UserContext } from '../../context/User';
import { API, showError, updateAPI } from '../../helpers';

const WorkOSCallback = () => {
  const [, userDispatch] = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const loadSelf = async () => {
      try {
        const res = await API.query('self', {}, { skipErrorHandler: true });
        const { success, message, data } = res.data;
        if (!success) {
          throw new Error(message || 'WorkOS session was not established');
        }
        if (cancelled) return;
        userDispatch({ type: 'login', payload: data });
        localStorage.setItem('user', JSON.stringify(data));
        updateAPI();
        navigate('/console', { replace: true });
      } catch (error) {
        if (cancelled) return;
        localStorage.removeItem('user');
        updateAPI();
        showError(error.message || 'WorkOS 登录失败');
        navigate('/login', { replace: true });
      }
    };

    loadSelf();

    return () => {
      cancelled = true;
    };
  }, [navigate, userDispatch]);

  return <Loading />;
};

export default WorkOSCallback;
