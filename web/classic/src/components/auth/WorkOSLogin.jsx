import React, { useEffect } from 'react';
import Loading from '../common/ui/Loading';

const WorkOSLogin = () => {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const params = new URLSearchParams();
    params.set('return_to', '/workos/callback');
    const affCode = searchParams.get('aff');
    if (affCode) {
      params.set('aff', affCode);
    }
    const screenHint = searchParams.get('screen_hint');
    if (screenHint) {
      params.set('screen_hint', screenHint);
    }
    window.location.assign(`/api/workos/login?${params.toString()}`);
  }, []);

  return <Loading />;
};

export default WorkOSLogin;
