import React from 'react';

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
