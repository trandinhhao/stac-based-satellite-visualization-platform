import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useNotificationStore } from '../store/useNotificationStore';

export const NotificationToast: React.FC = () => {
  const { open, message, severity, hideNotification } = useNotificationStore();

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    hideNotification();
  };

  // Curated premium neon colors for glassmorphism border and background
  const getGlassyStyles = () => {
    switch (severity) {
      case 'success':
        return {
          background: 'rgba(16, 185, 129, 0.15)', // Emerald green glass
          border: '1px solid rgba(16, 185, 129, 0.3)',
          iconColor: '#34d399',
        };
      case 'error':
        return {
          background: 'rgba(239, 68, 68, 0.15)', // Coral red glass
          border: '1px solid rgba(239, 68, 68, 0.3)',
          iconColor: '#f87171',
        };
      case 'warning':
        return {
          background: 'rgba(245, 158, 11, 0.15)', // Amber glass
          border: '1px solid rgba(245, 158, 11, 0.3)',
          iconColor: '#fbbf24',
        };
      case 'info':
      default:
        return {
          background: 'rgba(59, 130, 246, 0.15)', // Neon blue glass
          border: '1px solid rgba(59, 130, 246, 0.3)',
          iconColor: '#60a5fa',
        };
    }
  };

  const styles = getGlassyStyles();

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{
        marginTop: '64px', // Avoid overlapping top navigation bar
      }}
    >
      <Alert
        onClose={handleClose}
        severity={severity}
        variant="outlined"
        sx={{
          background: styles.background,
          backdropFilter: 'blur(16px)',
          webkitBackdropFilter: 'blur(16px)',
          border: styles.border,
          color: '#ffffff',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
          fontWeight: 500,
          borderRadius: '12px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.925rem',
          alignItems: 'center',
          '& .MuiAlert-icon': {
            color: styles.iconColor,
          },
          '& .MuiAlert-action': {
            color: 'rgba(255, 255, 255, 0.7)',
            alignItems: 'center',
            paddingTop: 0,
            paddingBottom: 0,
          },
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};
