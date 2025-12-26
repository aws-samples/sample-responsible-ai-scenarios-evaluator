import { AppBar, Toolbar, Typography, Box, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider, Chip } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const TopBar = () => {
  const navigate = useNavigate();
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  const handleInfoClick = () => {
    setInfoDialogOpen(true);
  };

  const handleInfoClose = () => {
    setInfoDialogOpen(false);
  };

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          bgcolor: 'var(--primary-color)',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.8
              }
            }}
            onClick={() => navigate('/')}
          >
            <AutoAwesomeIcon sx={{ mr: 1 }} />
            <Typography
              variant="h6"
              component="div"
              sx={{ fontWeight: 'bold' }}
            >
              Responsible AI Scenarios Evaluator
            </Typography>
          </Box>

          {/* Spacer to push info icon to the right */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Info Icon */}
          <IconButton
            color="inherit"
            onClick={handleInfoClick}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
            aria-label="Application Information"
          >
            <InfoIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Info Dialog */}
      <Dialog
        open={infoDialogOpen}
        onClose={handleInfoClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon sx={{ color: 'var(--primary-color)' }} />
            <Typography variant="h6" component="span">
              About the Application
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
              This application helps evaluate AI systems against responsible AI principles through automated scenario testing.
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
              AI Model Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'text.primary' }}>
                  Primary Model:
                </Typography>
                <Chip
                  label="Claude 3.7 Sonnet"
                  variant="outlined"
                  sx={{
                    mr: 1,
                    borderColor: 'var(--primary-color)',
                    color: 'var(--primary-color)'
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  us.anthropic.claude-3-7-sonnet-20250219-v1:0
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'text.primary' }}>
                  Usage:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Question generation for responsible AI evaluation
                  <br />
                  • Response evaluation and analysis
                </Typography>
              </Box>
            </Box>
          </Box>


        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleInfoClose}
            variant="contained"
            sx={{
              borderRadius: 2,
              backgroundColor: 'var(--primary-color)',
              '&:hover': {
                backgroundColor: 'var(--primary-hover-color)'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TopBar;