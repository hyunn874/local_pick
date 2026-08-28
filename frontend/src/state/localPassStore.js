import React from 'react';

import { API_BASE_URL } from '../api/apiClient';

let balance = 3;
let hasInitialized = false;
const listeners = [];

export const getBalance = () => balance;

export const setBalance = (newBalance) => {
  balance = Math.max(0, Number(newBalance) || 0);
  listeners.forEach((fn) => fn(balance));
};

export const useBalance = (initialBalance) => {
  if (!hasInitialized && Number.isFinite(initialBalance)) {
    balance = initialBalance;
    hasInitialized = true;
  }

  const [b, setB] = React.useState(balance);

  React.useEffect(() => {
    listeners.push(setB);

    return () => {
      const idx = listeners.indexOf(setB);
      if (idx > -1) {
        listeners.splice(idx, 1);
      }
    };
  }, []);

  return [b, setBalance];
};

export const syncBalanceFromServer = async (token) => {
  if (!token) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/local-pass/balance`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (data.success) {
      setBalance(data.data.balance);
    }
  } catch (error) {
    console.error('로컬패스 잔액 동기화 실패:', error);
  }
};
