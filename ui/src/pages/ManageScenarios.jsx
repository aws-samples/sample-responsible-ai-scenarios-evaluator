import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Refresh } from '@mui/icons-material';

const ManageScenarios = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    scenarioId: null,
    scenarioName: ''
  });
  const [deleting, setDeleting] = useState(false);

  // Fetch scenarios from API
  const fetchScenarios = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setSpinning(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`${window.env.API_GATEWAY_ENDPOINT}/list-scenarios`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': window.env.API_GATEWAY_APIKEY,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Scenarios response:', data);

      if (data.scenarios) {
        setScenarios(data.scenarios);
      } else {
        setScenarios([]);
      }
    } catch (err) {
      console.error('Error fetching scenarios:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      if (isRefresh) {
        setRefreshing(false);
        setSpinning(false);
      }
    }
  }, []);

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    await fetchScenarios(true);
  }, [fetchScenarios]);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  const handleEdit = (scenarioId) => {
    navigate(`/edit-scenarios/${scenarioId}`);
  };

  const handleDeleteClick = (scenario) => {
    setDeleteDialog({
      open: true,
      scenarioId: scenario.id,
      scenarioName: scenario.name
    });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      open: false,
      scenarioId: null,
      scenarioName: ''
    });
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`${window.env.API_GATEWAY_ENDPOINT}/delete-scenario?scenario_id=${deleteDialog.scenarioId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': window.env.API_GATEWAY_APIKEY,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Delete response:', data);

      // Close delete dialog
      handleDeleteCancel();

      // Refresh the scenarios list to get updated data
      await fetchScenarios();

    } catch (err) {
      console.error('Error deleting scenario:', err);
      alert('Error deleting scenario. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '100vh',
        bgcolor: 'white',
        pt: 4
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 1000 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ mb: 0 }}>
              Manage Scenarios
            </Typography>
            <IconButton
              onClick={handleManualRefresh}
              disabled={refreshing}
              sx={{
                color: 'var(--primary-color)',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.04)'
                }
              }}
              title="Refresh scenarios"
            >
              {refreshing ? (
                <CircularProgress size={20} sx={{ color: 'var(--primary-color)' }} />
              ) : (
                <Refresh
                  sx={{
                    animation: spinning ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': {
                        transform: 'rotate(0deg)',
                      },
                      '100%': {
                        transform: 'rotate(360deg)',
                      },
                    },
                    '&:hover': {
                      transform: spinning ? 'none' : 'rotate(45deg)',
                      transition: spinning ? 'none' : 'transform 0.2s ease'
                    }
                  }}
                />
              )}
            </IconButton>
          </Box>
          <Button
            variant="contained"
            onClick={() => navigate('/new-scenario')}
            sx={{
              backgroundColor: 'var(--primary-color)',
              '&:hover': {
                backgroundColor: 'var(--primary-hover-color)'
              }
            }}
          >
            Create Scenario
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress sx={{ color: 'var(--primary-color)' }} />
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="error">
              Error loading scenarios: {error}
            </Typography>
          </Box>
        ) : scenarios.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No scenarios found. Create your first scenario to get started.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Scenario</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Questions per Category</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scenarios.map((scenario) => (
                  <TableRow key={scenario.id} hover>
                    <TableCell sx={{ maxWidth: 400 }}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {scenario.name}
                      </Typography>
                      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                        {scenario.description}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body1">
                        {scenario.questionsPerCategory}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={scenario.status || 'COMPLETED'}
                        color={
                          scenario.status === 'COMPLETED' ? 'success' :
                            scenario.status === 'PROCESSING' ? 'warning' :
                              scenario.status === 'FAILED' ? 'error' : 'default'
                        }
                        size="small"
                        sx={{ minWidth: 80 }}
                      />
                      {scenario.status === 'FAILED' && scenario.error_message && (
                        <Tooltip title={scenario.error_message}>
                          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                            Error
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title={scenario.status === 'PROCESSING' ? 'Cannot edit while processing' : 'Edit scenario'}>
                          <span>
                            <IconButton
                              onClick={() => handleEdit(scenario.id)}
                              size="small"
                              sx={{ color: 'var(--primary-color)' }}
                              disabled={scenario.status === 'PROCESSING'}
                            >
                              <EditIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={scenario.status === 'PROCESSING' ? 'Cannot delete while processing' : 'Delete scenario'}>
                          <span>
                            <IconButton
                              onClick={() => handleDeleteClick(scenario)}
                              color="error"
                              size="small"
                              disabled={scenario.status === 'PROCESSING'}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={handleDeleteCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteIcon color="error" />
            Delete Scenario
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Are you sure you want to delete this scenario?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <strong>Scenario:</strong> {deleteDialog.scenarioName}
            </Typography>
            <Typography variant="body2" color="error">
              This action cannot be undone. All scenario data and associated questions will be permanently deleted.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCancel}
            variant="outlined"
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageScenarios;