import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Game from './components/Game';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
    },
    success: {
      main: '#4caf50',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Game />
    </ThemeProvider>
  );
}

export default App;
