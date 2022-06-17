import React from 'react';
import ReactDOM from 'react-dom';
import { createTheme, NextUIProvider } from '@nextui-org/react';
import App from './App';
import './index.css';

const darkTheme = createTheme({
  type: 'dark',
  theme: {
    colors: {},
    fonts: {},
  },
});

ReactDOM.render(
  <React.StrictMode>
    <NextUIProvider theme={darkTheme}>
      <App />
    </NextUIProvider>
  </React.StrictMode>,
  document.querySelector('#root'),
);
