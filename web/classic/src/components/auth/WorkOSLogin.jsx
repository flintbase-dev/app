import React, { useEffect } from 'react';
import Loading from '../common/ui/Loading';
import { API, showError } from '../../helpers';

const WorkOSLogin = () => {
  useEffect(() => {
    const redirect = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const params = { return_to: '/workos/callback' };
        const affCode = searchParams.get('aff');
        if (affCode) {
          params.aff = affCode;
        }
        const screenHint = searchParams.get('screen_hint');
        if (screenHint) {
          params.screen_hint = screenHint;
        }
        await API.redirect('workosLogin', { params });
      } catch (error) {
        showError(error.message || 'WorkOS 登录失败');
      }
    };
    redirect();
  }, []);

  return <Loading />;
};

export default WorkOSLogin;
