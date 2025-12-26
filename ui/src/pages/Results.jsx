import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Select,
  MenuItem,
  Chip,
  Paper,
  Card,
  CardContent,
  Grid,
  Divider,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  TextField,
  IconButton,
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Assessment, Schedule, CheckCircle, Cancel, Pending, Download, PictureAsPdf, Edit, Save, Refresh, Delete, UnfoldMore, UnfoldLess } from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { PILLAR_DEFINITIONS } from '../constants/pillars';
import ScoreDisplay from '../components/ScoreDisplay';
import QuestionScoreSlider from '../components/QuestionScoreSlider';


// Stacked circular progress component
function StackedCircularProgress({ passed, failed, pending, size = 150 }) {
  const total = passed + failed + pending;

  if (total === 0) {
    return (
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={0}
          size={size}
          sx={{ color: '#e0e0e0' }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h6" component="div">
            0/0
          </Typography>
        </Box>
      </Box>
    );
  }

  const passedPercent = (passed / total) * 100;
  const failedPercent = (failed / total) * 100;
  const pendingPercent = (pending / total) * 100;



  const radius = size / 2;
  const center = radius;

  // Calculate actual angles where each section appears on the circular progress
  // CircularProgress starts at top (-90°) and goes clockwise
  const startAngle = -90;

  // Calculate the actual section angles based on percentages
  const passedSectionAngle = startAngle + (passedPercent * 3.6) / 2; // Middle of passed section
  const failedSectionAngle = startAngle + passedPercent * 3.6 + (failedPercent * 3.6) / 2; // Middle of failed section
  const pendingSectionAngle = startAngle + (passedPercent + failedPercent) * 3.6 + (pendingPercent * 3.6) / 2; // Middle of pending section

  // Calculate label positions with overlap prevention
  const minAngleDifference = 45; // Minimum degrees between labels

  let passedLabelAngle = passedSectionAngle;
  let failedLabelAngle = failedSectionAngle;
  let pendingLabelAngle = pendingSectionAngle;

  // Adjust angles to prevent overlaps
  const activeLabels = [];
  if (passed > 0) activeLabels.push({ type: 'passed', angle: passedSectionAngle });
  if (failed > 0) activeLabels.push({ type: 'failed', angle: failedSectionAngle });
  if (pending > 0) activeLabels.push({ type: 'pending', angle: pendingSectionAngle });

  // Sort by angle and adjust positions
  activeLabels.sort((a, b) => a.angle - b.angle);

  for (let i = 0; i < activeLabels.length; i++) {
    const current = activeLabels[i];
    const next = activeLabels[(i + 1) % activeLabels.length];

    if (activeLabels.length > 1) {
      let angleDiff = next.angle - current.angle;
      if (angleDiff < 0) angleDiff += 360;

      if (angleDiff < minAngleDifference) {
        const adjustment = (minAngleDifference - angleDiff) / 2;
        current.angle -= adjustment;
        next.angle += adjustment;
      }
    }

    // Update the specific label angles
    if (current.type === 'passed') passedLabelAngle = current.angle;
    if (current.type === 'failed') failedLabelAngle = current.angle;
    if (current.type === 'pending') pendingLabelAngle = current.angle;
  }

  // Convert angles to coordinates for line endpoints
  const getCoordinates = (angle, distance) => {
    const radian = (angle * Math.PI) / 180;
    return {
      x: center + Math.cos(radian) * distance,
      y: center + Math.sin(radian) * distance
    };
  };

  return (
    <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', minWidth: size + 240, minHeight: size + 120, paddingLeft: 2 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex', width: size, height: size, marginLeft: '20px' }}>
          {/* Full circle showing all evaluations (pending + failed + passed) */}
          <CircularProgress
            variant="determinate"
            value={100}
            size={size}
            thickness={8}
            sx={{
              color: '#f57c00', // Orange for pending (bottom layer)
              position: 'absolute',
              top: 0,
              left: 0
            }}
          />

          {/* Failed + Passed layer */}
          <CircularProgress
            variant="determinate"
            value={passedPercent + failedPercent}
            size={size}
            thickness={8}
            sx={{
              color: '#f44336', // Red for failed
              position: 'absolute',
              top: 0,
              left: 0
            }}
          />

          {/* Passed (top layer) */}
          <CircularProgress
            variant="determinate"
            value={passedPercent}
            size={size}
            thickness={8}
            sx={{
              color: '#4caf50', // Green for passed
              position: 'absolute',
              top: 0,
              left: 0
            }}
          />

          {/* Center text */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: size,
              height: size,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
              {Math.round(passedPercent)}%
            </Typography>
            <Typography variant="caption" component="div" sx={{ textAlign: 'center', mt: -0.5 }}>
              passed
            </Typography>
          </Box>
        </Box>

      {/* SVG for drawing lines */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        {/* Passed section line and label */}
        {passed > 0 && (
          <line
            x1={36 + getCoordinates(passedSectionAngle, radius - 5).x}
            y1={60 + getCoordinates(passedSectionAngle, radius - 5).y}
            x2={36 + getCoordinates(passedLabelAngle, radius + 40).x}
            y2={60 + getCoordinates(passedLabelAngle, radius + 40).y}
            stroke="#4caf50"
            strokeWidth="2"
          />
        )}

        {/* Failed section line and label */}
        {failed > 0 && (
          <line
            x1={36 + getCoordinates(failedSectionAngle, radius - 5).x}
            y1={60 + getCoordinates(failedSectionAngle, radius - 5).y}
            x2={36 + getCoordinates(failedLabelAngle, radius + 40).x}
            y2={60 + getCoordinates(failedLabelAngle, radius + 40).y}
            stroke="#f44336"
            strokeWidth="2"
          />
        )}

        {/* Pending section line and label */}
        {pending > 0 && (
          <line
            x1={36 + getCoordinates(pendingSectionAngle, radius - 5).x}
            y1={60 + getCoordinates(pendingSectionAngle, radius - 5).y}
            x2={36 + getCoordinates(pendingLabelAngle, radius + 40).x}
            y2={60 + getCoordinates(pendingLabelAngle, radius + 40).y}
            stroke="#f57c00"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Floating labels */}
      {passed > 0 && (
        <Box
          sx={{
            position: 'absolute',
            left: Math.max(10, 36 + getCoordinates(passedLabelAngle, radius + 40).x - (passedLabelAngle > 90 && passedLabelAngle < 270 ? 120 : 0)),
            top: 60 + getCoordinates(passedLabelAngle, radius + 40).y - 12,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #4caf50',
            borderRadius: 1,
            padding: '4px 8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            zIndex: 10
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              backgroundColor: '#4caf50',
              borderRadius: '50%'
            }}
          />
          <Typography variant="caption" sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap', fontWeight: 500 }}>
            Passed: {passed} ({Math.round(passedPercent)}%)
          </Typography>
        </Box>
      )}

      {failed > 0 && (
        <Box
          sx={{
            position: 'absolute',
            left: Math.max(10, 36 + getCoordinates(failedLabelAngle, radius + 40).x - (failedLabelAngle > 90 && failedLabelAngle < 270 ? 120 : 0)),
            top: 60 + getCoordinates(failedLabelAngle, radius + 40).y - 12,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #f44336',
            borderRadius: 1,
            padding: '4px 8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            zIndex: 10
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              backgroundColor: '#f44336',
              borderRadius: '50%'
            }}
          />
          <Typography variant="caption" sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap', fontWeight: 500 }}>
            Failed: {failed} ({Math.round(failedPercent)}%)
          </Typography>
        </Box>
      )}

      {pending > 0 && (
        <Box
          sx={{
            position: 'absolute',
            left: Math.max(10, 36 + getCoordinates(pendingLabelAngle, radius + 40).x - (pendingLabelAngle > 90 && pendingLabelAngle < 270 ? 120 : 0)),
            top: 60 + getCoordinates(pendingLabelAngle, radius + 40).y - 12,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #f57c00',
            borderRadius: 1,
            padding: '4px 8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            zIndex: 10
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              backgroundColor: '#f57c00',
              borderRadius: '50%'
            }}
          />
          <Typography variant="caption" sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap', fontWeight: 500 }}>
            Pending: {pending} ({Math.round(pendingPercent)}%)
          </Typography>
        </Box>
      )}
    </Box>
  );
}

const Results = () => {
  const navigate = useNavigate();
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');

  // Use shared pillar definitions
  const pillarDefinitions = Object.keys(PILLAR_DEFINITIONS).reduce((acc, key) => {
    acc[key.replace('-', ' and ')] = PILLAR_DEFINITIONS[key].enhancedDefinition;
    return acc;
  }, {});
  const [reports, setReports] = useState([]);
  const [evaluatingId, setEvaluatingId] = useState(null);

  const [expandedReport, setExpandedReport] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState({});
  const [pendingUpdates, setPendingUpdates] = useState({}); // Track pending evaluation changes
  const [isUpdating, setIsUpdating] = useState(false); // Prevent concurrent updates
  const [loading, setLoading] = useState(true); // Loading state
  const [refreshing, setRefreshing] = useState(false); // Manual refresh loading state
  const [spinning, setSpinning] = useState(false); // Icon spinning animation state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [exportOptions, setExportOptions] = useState({
    reportType: 'detailed',
    includeChart: true,
    includeConfig: true,
    includeConsiderations: true
  });
  const [isExporting, setIsExporting] = useState(false);
  const [scenarioNotFoundDialog, setScenarioNotFoundDialog] = useState({
    open: false,
    message: '',
    scenarioId: null
  });
  const [successDialog, setSuccessDialog] = useState({
    open: false,
    title: '',
    message: ''
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    reportId: null,
    reportName: ''
  });
  const [deleting, setDeleting] = useState(false);
  const chartRefs = useRef({});
  const circularChartRefs = useRef({});
  const [editingComments, setEditingComments] = useState({}); // Track which comments are being edited
  const commentRefs = useRef({}); // Refs to access textarea values directly

  useEffect(() => { // set API endpoint & API key from environment
    setApiEndpoint(window.env.API_GATEWAY_ENDPOINT.replace(/^https:\/\//, ''))
    setApiKey(window.env.API_GATEWAY_APIKEY)
  }, []);

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    setSpinning(true);

    try {
      if (apiEndpoint.trim() !== "" && apiKey.trim() !== "") {
        const responseData = await axios.get(`https://${apiEndpoint}/results`, {
          headers: {
            'x-api-key': apiKey,
          },
        });
        const sortedData = responseData.data.message.sort((a, b) => {
          return new Date(b.datetime) - new Date(a.datetime);
        });

        // Use current pendingUpdates state to avoid stale closure
        setPendingUpdates(currentPendingUpdates => {
          // Merge server data with pending local updates and sort categories
          const mergedData = sortedData.map(report => {
            // First sort categories alphabetically (inline)
            let sortedReport = report;
            if (report.promptPairs) {
              const sortedPromptPairs = {};
              Object.keys(report.promptPairs)
                .sort((a, b) => a.localeCompare(b))
                .forEach(category => {
                  sortedPromptPairs[category] = report.promptPairs[category];
                });

              const sortedScoreBreakdown = {};
              if (report.score_breakdown) {
                Object.keys(report.score_breakdown)
                  .sort((a, b) => a.localeCompare(b))
                  .forEach(category => {
                    sortedScoreBreakdown[category] = report.score_breakdown[category];
                  });
              }

              sortedReport = {
                ...report,
                promptPairs: sortedPromptPairs,
                score_breakdown: sortedScoreBreakdown
              };
            }

            const reportPendingUpdates = currentPendingUpdates[report.id];
            if (!reportPendingUpdates || Object.keys(reportPendingUpdates).length === 0) {
              return sortedReport; // No pending updates for this report
            }

            // Apply pending updates to this report
            const updatedPromptPairs = { ...sortedReport.promptPairs };
            Object.keys(updatedPromptPairs).forEach(category => {
              updatedPromptPairs[category] = updatedPromptPairs[category].map(pair => {
                const pendingUpdate = reportPendingUpdates[pair.question_id];
                return pendingUpdate
                  ? { ...pair, score: pendingUpdate, human_evaluation: 'EVALUATED' }
                  : pair;
              });
            });

            // Recalculate scores with pending updates (maintain alphabetical order)
            const newScoreBreakdown = {};
            const categoryScores = [];

            // Process categories in alphabetical order
            Object.keys(updatedPromptPairs)
              .sort((a, b) => a.localeCompare(b))
              .forEach(category => {
                const pairs = updatedPromptPairs[category];
                // Calculate average score for ALL questions (PENDING and EVALUATED)
                const totalScore = pairs.reduce((sum, pair) => sum + parseFloat(pair.score || 1), 0);
                const categoryScore = pairs.length > 0 ? totalScore / pairs.length : 1.0;
                
                newScoreBreakdown[category] = categoryScore.toString();
                categoryScores.push(categoryScore);
              });

            const newOverallScore = categoryScores.length > 0
              ? (categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length).toString()
              : "1.0";

            return {
              ...sortedReport,
              promptPairs: updatedPromptPairs,
              score_breakdown: newScoreBreakdown,
              score: newOverallScore
            };
          });

          setReports(mergedData);
          setLoading(false);



          return currentPendingUpdates;
        });
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      setLoading(false);
    } finally {
      setRefreshing(false);
      setSpinning(false);
    }
  }, [apiEndpoint, apiKey]);



  // Helper function to sort categories alphabetically
  const sortCategoriesAlphabetically = useCallback((report) => {
    if (!report.promptPairs) return report;

    // Sort promptPairs by category name
    const sortedPromptPairs = {};
    Object.keys(report.promptPairs)
      .sort((a, b) => a.localeCompare(b))
      .forEach(category => {
        sortedPromptPairs[category] = report.promptPairs[category];
      });

    // Sort score_breakdown by category name
    const sortedScoreBreakdown = {};
    if (report.score_breakdown) {
      Object.keys(report.score_breakdown)
        .sort((a, b) => a.localeCompare(b))
        .forEach(category => {
          sortedScoreBreakdown[category] = report.score_breakdown[category];
        });
    }

    return {
      ...report,
      promptPairs: sortedPromptPairs,
      score_breakdown: sortedScoreBreakdown
    };
  }, []);

  // Load data and merge with pending updates
  const getData = async () => {
    try {
      if (apiEndpoint.trim() !== "" && apiKey.trim() !== "") {
        try {
          const responseData = await axios.get(`https://${apiEndpoint}/results`, {
            headers: {
              'x-api-key': apiKey,
            },
          });
          const sortedData = responseData.data.message.sort((a, b) => {
            return new Date(b.datetime) - new Date(a.datetime);
          });

          // Use current pendingUpdates state to avoid stale closure
          setPendingUpdates(currentPendingUpdates => {
            // Merge server data with pending local updates and sort categories
            const mergedData = sortedData.map(report => {
              // First sort categories alphabetically
              const sortedReport = sortCategoriesAlphabetically(report);

              const reportPendingUpdates = currentPendingUpdates[report.id];
              if (!reportPendingUpdates || Object.keys(reportPendingUpdates).length === 0) {
                return sortedReport; // No pending updates for this report
              }

              // Apply pending updates to this report
              const updatedPromptPairs = { ...sortedReport.promptPairs };
              Object.keys(updatedPromptPairs).forEach(category => {
                updatedPromptPairs[category] = updatedPromptPairs[category].map(pair => {
                  const pendingUpdate = reportPendingUpdates[pair.question_id];
                  return pendingUpdate
                    ? { ...pair, score: pendingUpdate, human_evaluation: 'EVALUATED' }
                    : pair;
                });
              });

              // Recalculate scores with pending updates (maintain alphabetical order)
              const newScoreBreakdown = {};
              const categoryScores = [];

              // Process categories in alphabetical order
              Object.keys(updatedPromptPairs)
                .sort((a, b) => a.localeCompare(b))
                .forEach(category => {
                  const pairs = updatedPromptPairs[category];
                  // Calculate average score for ALL questions (PENDING and EVALUATED)
                  const totalScore = pairs.reduce((sum, pair) => sum + parseFloat(pair.score || 1), 0);
                  const categoryScore = pairs.length > 0 ? totalScore / pairs.length : 1.0;
                  
                  newScoreBreakdown[category] = categoryScore.toString();
                  categoryScores.push(categoryScore);
                });

              const newOverallScore = categoryScores.length > 0
                ? (categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length).toString()
                : "1.0";

              return {
                ...sortedReport,
                promptPairs: updatedPromptPairs,
                score_breakdown: newScoreBreakdown,
                score: newOverallScore
              };
            });

            setReports(mergedData);
            setLoading(false); // Set loading to false after data is loaded



            return currentPendingUpdates; // Return unchanged pendingUpdates
          });
        } catch (error) {
          console.error('Error fetching data:', error);
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  }

  // Load data when page first loads
  useEffect(() => {
    getData();
  }, [apiEndpoint, apiKey]);

  const handleReportChange = (panel) => (event, isExpanded) => {
    setExpandedReport(isExpanded ? panel : false);
  };

  const handleCategoryChange = (reportId, category) => (event, isExpanded) => {
    setExpandedCategory({
      ...expandedCategory,
      [`${reportId}-${category}`]: isExpanded
    });
  };

  const handleExpandAll = (reportId, promptPairs) => {
    const newExpandedState = { ...expandedCategory };
    Object.keys(promptPairs).forEach(category => {
      newExpandedState[`${reportId}-${category}`] = true;
    });
    setExpandedCategory(newExpandedState);
  };

  const handleCollapseAll = (reportId, promptPairs) => {
    const newExpandedState = { ...expandedCategory };
    Object.keys(promptPairs).forEach(category => {
      newExpandedState[`${reportId}-${category}`] = false;
    });
    setExpandedCategory(newExpandedState);
  };

  const handleReEvaluate = (report) => {
    // // Transform headers into required format
    // const transformedHeaders = Object.entries(report.headers).map(([key, value]) => ({
    //   key: key,
    //   value: String(value)
    // }));

    // // Transform bodyParams into required format
    // const transformedBodyParams = Object.entries(report.bodyParams).map(([key, value]) => ({
    //   key: key,
    //   value: String(value)
    // }));

    // navigate('/', { 
    //   state: {
    //     headers: transformedHeaders, 
    //     bodyParams: transformedBodyParams,
    //     formData: {
    //       name: report.name,
    //       description: report.description,
    //       endpoint: report.endpoint,
    //       inputPromptKey: report.inputPromptKey,
    //       outputResponseKey: report.outputResponseKey,
    //       copiedReportID: String(report.id)
    //     }
    //   }
    // });


    const payload = {
      name: report.name,
      description: report.description,
      endpoint: report.endpoint,
      inputPromptKey: report.inputPromptKey,
      outputResponseKey: report.outputResponseKey,
      copiedReportID: String(report.id),
      scenario_id: report.scenario_id,
      headers: report.headers,
      bodyParams: report.bodyParams,
    };

    // axios post payload to api gateway endpoint using api key in headers
    axios.post(`https://${apiEndpoint}/evaluate`, payload, {
      headers: {
        'x-api-key': apiKey,
      },
    })
      .then((response) => {
        console.log('Evaluation response:', response.data);
        // Success - evaluation started
        setSuccessDialog({
          open: true,
          title: 'Evaluation Submitted Successfully',
          message: 'The evaluation has been submitted and is now in progress. The results will be updated automatically.'
        });

        // Trigger a refresh of the results data
        handleManualRefresh();
      })
      .catch((error) => {
        console.error('Evaluation error:', error);

        // Check if this is a scenario not found error
        if (error.response && error.response.data) {
          const errorData = error.response.data;

          if (errorData.error === 'SCENARIO_NOT_FOUND') {
            // Show popup/dialog for scenario not found
            setScenarioNotFoundDialog({
              open: true,
              message: errorData.message,
              scenarioId: errorData.scenario_id
            });
            return;
          }
        }

        // Handle other errors
        alert('Error starting evaluation. Please try again.');
      })
      .finally(() => {
        // Reset evaluating state after delay
        setTimeout(() => {
          setEvaluatingId(null);
        }, 1000);
      });
  };



  const prepareRadarData = (breakdown) => {
    return Object.entries(breakdown).map(([key, value]) => ({
      subject: key.charAt(0).toUpperCase() + key.slice(1),
      score: parseFloat(value) // Use the actual score value (1-5)
    }));
  };

  const getEvaluationColor = useCallback((evaluation) => {
    switch (evaluation) {
      case 'PASS': return 'green';
      case 'FAIL': return 'red';
      case 'PENDING':
      default: return 'grey';
    }
  }, []);

  const getEvaluatedCount = useCallback((pairs) => {
    return pairs.filter(pair => pair.human_evaluation === 'EVALUATED').length;
  }, []);



  const getCategoryScore = useCallback((pairs) => {
    if (pairs.length === 0) return null;

    // Calculate average score for ALL questions in this category (PENDING and EVALUATED)
    const totalScore = pairs.reduce((sum, pair) => sum + parseFloat(pair.score || 1), 0);
    return totalScore / pairs.length;
  }, []);

  // Calculate evaluation counts for a report
  const getEvaluationCounts = useCallback((report) => {
    let evaluated = 0, pending = 0;

    Object.values(report.promptPairs || {}).forEach(pairs => {
      pairs.forEach(pair => {
        switch (pair.human_evaluation) {
          case 'EVALUATED':
            evaluated++;
            break;
          case 'PENDING':
          default:
            pending++;
            break;
        }
      });
    });

    return { evaluated, pending };
  }, []);

  const handleCommentEdit = useCallback((questionId, currentComment) => {
    setEditingComments(prev => ({ ...prev, [questionId]: true }));
    // Set the textarea value directly when editing starts
    if (commentRefs.current[questionId]) {
      commentRefs.current[questionId].value = currentComment || '';
    }
  }, []);

  const handleCommentCancel = useCallback((questionId) => {
    setEditingComments(prev => ({ ...prev, [questionId]: false }));

    // Find the original comment from reports and reset textarea directly
    let originalComment = '';
    for (const report of reports) {
      if (report.promptPairs) {
        for (const pairs of Object.values(report.promptPairs)) {
          const pair = pairs.find(p => p.question_id === questionId);
          if (pair) {
            originalComment = pair.comments || '';
            break;
          }
        }
      }
    }

    // Reset textarea value directly
    if (commentRefs.current[questionId]) {
      commentRefs.current[questionId].value = originalComment;
    }
  }, [reports]);

  const handleCommentSave = useCallback(async (questionId, reportId) => {
    try {


      const comment = commentRefs.current[questionId]?.value || '';



      // Update local state immediately
      setReports(prevReports =>
        prevReports.map(report => {
          if (report.id === reportId) {
            const updatedPromptPairs = { ...report.promptPairs };
            Object.keys(updatedPromptPairs).forEach(category => {
              updatedPromptPairs[category] = updatedPromptPairs[category].map(pair =>
                pair.question_id === questionId
                  ? { ...pair, comments: comment }
                  : pair
              );
            });
            return { ...report, promptPairs: updatedPromptPairs };
          }
          return report;
        })
      );

      setEditingComments(prev => ({ ...prev, [questionId]: false }));



      // Send API request in background
      await axios.post(`https://${apiEndpoint}/save-evaluation-comment`, {
        question_id: questionId,
        report_id: reportId,
        comments: comment
      }, {
        headers: {
          'x-api-key': apiKey,
        },
      });



    } catch (error) {
      console.error('Error saving comment:', error);
      alert('Error saving comment. Please try again.');


    }
  }, [apiEndpoint, apiKey]);





  const handleScoreChange = useCallback(async (questionId, reportId, newScore) => {
    // Prevent concurrent updates
    if (isUpdating) return;

    // Check if API endpoint and key are available
    if (!apiEndpoint || !apiKey) {
      console.error('API endpoint or key not available');
      return;
    }

    try {
      setIsUpdating(true);

      // Track pending update to prevent server data from overriding
      setPendingUpdates(prev => ({
        ...prev,
        [reportId]: {
          ...prev[reportId],
          [questionId]: newScore
        }
      }));

      // Update local state immediately for responsive UI
      setReports(prevReports =>
        prevReports.map(report => {
          if (report.id === reportId) {
            const updatedPromptPairs = { ...report.promptPairs };
            Object.keys(updatedPromptPairs).forEach(category => {
              updatedPromptPairs[category] = updatedPromptPairs[category].map(pair =>
                pair.question_id === questionId
                  ? { ...pair, score: newScore, human_evaluation: 'EVALUATED' }
                  : pair
              );
            });

            // Recalculate scores immediately for smooth UX (maintain alphabetical order)
            const newScoreBreakdown = {};
            const categoryScores = [];

            // Process categories in alphabetical order
            Object.keys(updatedPromptPairs)
              .sort((a, b) => a.localeCompare(b))
              .forEach(category => {
                const pairs = updatedPromptPairs[category];
                // Calculate average score for ALL questions (PENDING and EVALUATED)
                const totalScore = pairs.reduce((sum, pair) => sum + parseFloat(pair.score || 1), 0);
                const categoryScore = pairs.length > 0 ? totalScore / pairs.length : 1.0;
                
                newScoreBreakdown[category] = categoryScore.toString();
                categoryScores.push(categoryScore);
              });

            const newOverallScore = categoryScores.length > 0
              ? (categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length).toString()
              : "1.0";

            return {
              ...report,
              promptPairs: updatedPromptPairs,
              score_breakdown: newScoreBreakdown,
              score: newOverallScore
            };
          }
          return report;
        })
      );

      // Send API request in background
      try {
        console.log('Sending score update:', { questionId, reportId, newScore });
        const response = await axios.post(`https://${apiEndpoint}/update-question-evaluation`, {
          question_id: questionId,
          report_id: reportId,
          score: newScore
        }, {
          headers: {
            'x-api-key': apiKey,
          },
        });
        console.log('Score update response:', response.data);

        // Remove from pending updates after successful API call
        setPendingUpdates(prev => {
          const updated = { ...prev };
          if (updated[reportId]) {
            delete updated[reportId][questionId];
            if (Object.keys(updated[reportId]).length === 0) {
              delete updated[reportId];
            }
          }
          return updated;
        });

      } catch (error) {
        console.error('Error updating score:', error);
        console.error('Error details:', error.response?.data || error.message);
        // Remove from pending updates and refresh data on error
        setPendingUpdates(prev => {
          const updated = { ...prev };
          if (updated[reportId]) {
            delete updated[reportId][questionId];
            if (Object.keys(updated[reportId]).length === 0) {
              delete updated[reportId];
            }
          }
          return updated;
        });
        // Don't call getData() immediately on error to prevent flickering
        setTimeout(() => getData(), 1000);
        // Re-throw error so QuestionScoreSlider can handle it
        throw error;
      }

    } catch (error) {
      console.error('Error updating score:', error);
      setTimeout(() => getData(), 1000);
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating, apiEndpoint, apiKey]);

  // PDF Export Functions
  const handleExportClick = (report) => {
    setSelectedReport(report);
    setExportDialogOpen(true);
  };

  const handleExportClose = () => {
    setExportDialogOpen(false);
    setSelectedReport(null);
    setExportOptions({
      reportType: 'detailed',
      includeChart: true,
      includeConfig: true,
      includeConsiderations: true
    });
  };

  const handleSuccessDialogClose = () => {
    setSuccessDialog({
      open: false,
      title: '',
      message: ''
    });
  };

  const handleDeleteClick = (report) => {
    setDeleteDialog({
      open: true,
      reportId: report.id,
      reportName: report.name
    });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      open: false,
      reportId: null,
      reportName: ''
    });
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${window.env.API_GATEWAY_ENDPOINT}/delete-result`, {
        headers: {
          'x-api-key': window.env.API_GATEWAY_APIKEY,
        },
        data: {
          report_id: deleteDialog.reportId
        }
      });

      setSuccessDialog({
        open: true,
        title: 'Result Deleted Successfully',
        message: 'The evaluation result has been deleted successfully.'
      });

      // Close delete dialog
      handleDeleteCancel();

      // Refresh results data
      handleManualRefresh();
    } catch (error) {
      console.error('Error deleting result:', error);
      alert('Error deleting result. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const generatePDF = async () => {
    if (!selectedReport) return;

    setIsExporting(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Helper function to add new page if needed
      const checkPageBreak = (requiredHeight) => {
        // Reserve extra space for footer (20mm margin + 15mm for footer content)
        if (yPosition + requiredHeight > pageHeight - margin - 15) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Responsible AI Scenarios Evaluation Report', margin, yPosition);
      yPosition += 15;

      // Report metadata
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const reportDate = new Date(selectedReport.datetime).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }) + ', ' + new Date(selectedReport.datetime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      pdf.text(`Report ID: ${selectedReport.id}`, margin, yPosition);
      yPosition += 7;
      pdf.text(`Generated: ${reportDate}`, margin, yPosition);
      yPosition += 7;
      pdf.text(`Application: ${selectedReport.name}`, margin, yPosition);
      yPosition += 15;

      // Executive Summary
      checkPageBreak(30);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Executive Summary', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Average Score: ${parseFloat(selectedReport.score).toFixed(1)}`, margin, yPosition);
      yPosition += 7;

      const totalQuestions = Object.values(selectedReport.promptPairs || {}).reduce((sum, pairs) => sum + pairs.length, 0);
      const evaluatedQuestions = Object.values(selectedReport.promptPairs || {}).reduce((sum, pairs) =>
        sum + pairs.filter(pair => pair.human_evaluation === 'EVALUATED').length, 0
      );

      pdf.text(`Evaluation Status: ${evaluatedQuestions}/${totalQuestions} questions evaluated`, margin, yPosition);
      yPosition += 15;

      // Application Details
      if (exportOptions.includeConfig) {
        checkPageBreak(40);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Application Details', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');

        // Description
        const description = selectedReport.description || 'No description provided';
        const descriptionLines = pdf.splitTextToSize(description, pageWidth - 2 * margin);
        pdf.text('Description:', margin, yPosition);
        yPosition += 5;
        pdf.text(descriptionLines, margin + 5, yPosition);
        yPosition += descriptionLines.length * 4 + 5;

        // Endpoint
        pdf.text('Endpoint:', margin, yPosition);
        yPosition += 5;
        pdf.text(selectedReport.endpoint, margin + 5, yPosition);
        yPosition += 10;

        // Scenario
        if (selectedReport.scenario_name) {
          pdf.text('Scenario:', margin, yPosition);
          yPosition += 5;
          pdf.text(selectedReport.scenario_name, margin + 5, yPosition);
          yPosition += 10;
        }
      }

      // Score Breakdown
      checkPageBreak(50);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Score Breakdown by Category', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      Object.entries(selectedReport.score_breakdown || {}).forEach(([category, score]) => {
        checkPageBreak(7);
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        const scoreValue = parseFloat(score).toFixed(1);
        pdf.text(`${categoryName}: ${scoreValue}`, margin, yPosition);
        yPosition += 6;
      });
      yPosition += 10;

      // Capture and add radar chart if enabled
      if (exportOptions.includeChart && chartRefs.current[selectedReport.id]) {
        try {
          checkPageBreak(80);
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Performance Radar Chart', margin, yPosition);
          yPosition += 10;

          const chartElement = chartRefs.current[selectedReport.id];
          const canvas = await html2canvas(chartElement, {
            backgroundColor: '#ffffff',
            scale: 2
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 120;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          checkPageBreak(imgHeight + 10);
          pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 15;
        } catch (error) {
          console.warn('Could not capture chart:', error);
        }
      }

      // Capture and add circular chart if enabled
      if (exportOptions.includeChart && circularChartRefs.current[selectedReport.id]) {

      }

      // Detailed Evaluation Results (if detailed report)
      if (exportOptions.reportType === 'detailed' && selectedReport.promptPairs) {
        Object.entries(selectedReport.promptPairs).forEach(([category, pairs]) => {
          checkPageBreak(30);
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${category.charAt(0).toUpperCase() + category.slice(1)} - Detailed Results`, margin, yPosition);
          yPosition += 10;

          pairs.forEach((pair, index) => {
            checkPageBreak(40);

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Scenario Question ${index + 1}:`, margin, yPosition);
            yPosition += 5;

            pdf.setFont('helvetica', 'normal');
            const questionLines = pdf.splitTextToSize(pair.question, pageWidth - 2 * margin - 5);
            pdf.text(questionLines, margin + 5, yPosition);
            yPosition += questionLines.length * 4 + 3;

            pdf.setFont('helvetica', 'bold');
            pdf.text('Application Response:', margin, yPosition);
            yPosition += 5;

            pdf.setFont('helvetica', 'normal');
            const answerLines = pdf.splitTextToSize(pair.answer, pageWidth - 2 * margin - 5);
            pdf.text(answerLines, margin + 5, yPosition);
            yPosition += answerLines.length * 4 + 3;

            if (exportOptions.includeConsiderations && pair.considerations) {
              pdf.setFont('helvetica', 'bold');
              pdf.text('AI Considerations:', margin, yPosition);
              yPosition += 5;

              pdf.setFont('helvetica', 'normal');
              const considerationsLines = pdf.splitTextToSize(pair.considerations, pageWidth - 2 * margin - 5);
              pdf.text(considerationsLines, margin + 5, yPosition);
              yPosition += considerationsLines.length * 4 + 3;
            }

            pdf.setFont('helvetica', 'bold');
            pdf.text('Human Evaluation:', margin, yPosition);
            yPosition += 5;
            
            const evaluation = pair.human_evaluation || 'PENDING';
            const score = pair.score || 1;
            const scoreColor = evaluation === 'EVALUATED' ? 
              (score >= 4 ? [0, 128, 0] : score >= 3 ? [255, 165, 0] : [255, 0, 0]) : 
              [128, 128, 128];
            pdf.setTextColor(...scoreColor);
            pdf.setFont('helvetica', 'normal');
            const displayText = evaluation === 'EVALUATED' ? `Score: ${score}` : 'Status: PENDING';
            pdf.text(displayText, margin + 5, yPosition);
            pdf.setTextColor(0, 0, 0); // Reset to black
            yPosition += 7;

            // Add human evaluation comments if they exist
            if (pair.comments && pair.comments.trim()) {
              pdf.setFont('helvetica', 'bold');
              pdf.text('Evaluation Comments:', margin, yPosition);
              yPosition += 5;

              pdf.setFont('helvetica', 'normal');
              const commentsLines = pdf.splitTextToSize(pair.comments, pageWidth - 2 * margin - 5);
              pdf.text(commentsLines, margin + 5, yPosition);
              yPosition += commentsLines.length * 4 + 3;
            }

            yPosition += 7;
          });
        });
      }

      // Footer
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
      }

      // Save the PDF
      const fileName = `evaluation-report-${selectedReport.id}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      handleExportClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', bgcolor: 'white', pt: 4 }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 1200 }}>
        <Typography variant="h6" gutterBottom>
          Evaluation Results
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress sx={{ color: 'var(--primary-color)' }} />
        </Box>
      </Paper>
    </Box>
  );

  // Get status icon based on evaluation state
  const getStatusIcon = (report) => {
    if (!report.hasOwnProperty('score')) return <Schedule color="action" />;

    const totalQuestions = Object.values(report.promptPairs || {}).reduce((sum, pairs) => sum + pairs.length, 0);
    const evaluatedQuestions = Object.values(report.promptPairs || {}).reduce((sum, pairs) =>
      sum + pairs.filter(pair => pair.human_evaluation === 'EVALUATED').length, 0
    );

    if (evaluatedQuestions === 0) return <Pending color="warning" />;
    if (evaluatedQuestions === totalQuestions) return <CheckCircle color="success" />;
    return <Assessment color="primary" />;
  };

  // Get status text
  const getStatusText = (report) => {
    if (!report.hasOwnProperty('score')) return 'Automated evaluation in progress';

    const totalQuestions = Object.values(report.promptPairs || {}).reduce((sum, pairs) => sum + pairs.length, 0);
    const evaluatedQuestions = Object.values(report.promptPairs || {}).reduce((sum, pairs) =>
      sum + pairs.filter(pair => pair.human_evaluation === 'EVALUATED').length, 0
    );

    if (evaluatedQuestions === 0) return 'Pending Human Evaluation';
    if (evaluatedQuestions === totalQuestions) return 'Human Evaluation Completed';
    return `${evaluatedQuestions}/${totalQuestions} Evaluated`;
  };

  // Get status chip color
  const getStatusChipColor = (report) => {
    if (!report.hasOwnProperty('score')) return 'default';

    const totalQuestions = Object.values(report.promptPairs || {}).reduce((sum, pairs) => sum + pairs.length, 0);
    const evaluatedQuestions = Object.values(report.promptPairs || {}).reduce((sum, pairs) =>
      sum + pairs.filter(pair => pair.human_evaluation === 'EVALUATED').length, 0
    );

    if (evaluatedQuestions === totalQuestions) return 'success';
    if (evaluatedQuestions === 0) return 'warning';
    return 'primary';
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', bgcolor: 'white', pt: 4 }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 1200 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            Evaluation Results
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
            title="Refresh results"
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

        {reports.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No evaluation results found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Run your first evaluation to see results here.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {reports.map((report) => (
              <Card key={report.id} elevation={2} sx={{ overflow: 'visible' }}>
                <Accordion
                  expanded={expandedReport === report.id}
                  onChange={handleReportChange(report.id)}
                  sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      px: 3,
                      py: 2,
                      '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.02)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      {getStatusIcon(report)}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {report.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(report.datetime).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}, {new Date(report.datetime).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })}
                          </Typography>
                          <Chip
                            label={`ID: ${report.id}`}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={getStatusText(report)}
                            size="small"
                            color={getStatusChipColor(report)}
                          />
                          {report.hasOwnProperty('score') && (
                            <Chip
                              label={`Score: ${parseFloat(report.score).toFixed(1)}`}
                              size="small"
                              color={report.score >= 4 ? 'success' : report.score >= 3 ? 'warning' : 'error'}
                              sx={{ fontWeight: 'bold' }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </AccordionSummary>

                  {report.hasOwnProperty('score') && (
                    <AccordionDetails sx={{ px: 3, pb: 3 }}>
                      {/* Report Overview */}
                      <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                              Application Details
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Box>
                                <Typography variant="body2" color="text.secondary">Description</Typography>
                                <Typography variant="body2">{report.description}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary">Endpoint</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                  {report.endpoint}
                                </Typography>
                              </Box>
                              {report.scenario_name && (
                                <Box>
                                  <Typography variant="body2" color="text.secondary">Scenario</Typography>
                                  <Typography variant="body2">{report.scenario_name}</Typography>
                                </Box>
                              )}
                            </Box>
                          </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                              Configuration
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Box>
                                <Typography variant="body2" color="text.secondary">Input Key</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {report.inputPromptKey}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary">Output Key</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {report.outputResponseKey}
                                </Typography>
                              </Box>
                              {Object.keys(report.headers || {}).length > 0 && (
                                <Box>
                                  <Typography variant="body2" color="text.secondary">Headers</Typography>
                                  <TableContainer sx={{ mt: 1 }}>
                                    <Table size="small">
                                      <TableBody>
                                        {Object.entries(report.headers).map(([key, value]) => (
                                          <TableRow key={key}>
                                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', py: 0.5, border: 'none' }}>
                                              {key}
                                            </TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', py: 0.5, border: 'none' }}>
                                              {JSON.stringify(value)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Box>
                              )}
                              {Object.keys(report.bodyParams || {}).length > 0 && (
                                <Box>
                                  <Typography variant="body2" color="text.secondary">Body Parameters</Typography>
                                  <TableContainer sx={{ mt: 1 }}>
                                    <Table size="small">
                                      <TableBody>
                                        {Object.entries(report.bodyParams).map(([key, value]) => (
                                          <TableRow key={key}>
                                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', py: 0.5, border: 'none' }}>
                                              {key}
                                            </TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', py: 0.5, border: 'none' }}>
                                              {JSON.stringify(value)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Box>
                              )}
                            </Box>
                          </Card>
                        </Grid>
                      </Grid>

                      {/* Score Visualization */}
                      <Card variant="outlined" sx={{ p: 3, mb: 4 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
                          Evaluation Results
                        </Typography>
                        <Grid container spacing={4} alignItems="center">
                          <Grid item xs={12} md={8}>
                            <Box
                              ref={el => chartRefs.current[report.id] = el}
                              sx={{ width: '100%', height: 300 }}
                            >
                              <ResponsiveContainer>
                                <RadarChart data={prepareRadarData(report.score_breakdown)}>
                                  <PolarGrid />
                                  <PolarAngleAxis dataKey="subject" />
                                  <PolarRadiusAxis angle={30} domain={[1, 5]} />
                                  <Radar
                                    name="Score"
                                    dataKey="score"
                                    stroke="var(--primary-color)"
                                    fill="var(--primary-color)"
                                    fillOpacity={0.3}
                                    strokeWidth={2}
                                  />
                                </RadarChart>
                              </ResponsiveContainer>
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
                              <Box ref={el => circularChartRefs.current[report.id] = el} sx={{ display: 'flex', justifyContent: 'center' }}>
                                <ScoreDisplay 
                                  score={report.score || 1.0}
                                  size="large"
                                  label="Average Score"
                                />
                              </Box>
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: '250px' }}>
                                <Button
                                  variant="contained"
                                  fullWidth
                                  disabled={evaluatingId === report.id}
                                  sx={{
                                    backgroundColor: 'var(--primary-color)',
                                    '&:hover': { backgroundColor: 'var(--primary-hover-color)' }
                                  }}
                                  onClick={() => {
                                    setEvaluatingId(report.id);
                                    setTimeout(() => {
                                      setEvaluatingId(null);
                                      handleReEvaluate(report);
                                    }, 5000);
                                  }}
                                >
                                  {evaluatingId === report.id ? 'Evaluating...' : 'Re-evaluate'}
                                </Button>
                                <Button
                                  variant="outlined"
                                  fullWidth
                                  startIcon={<PictureAsPdf />}
                                  onClick={() => handleExportClick(report)}
                                  sx={{
                                    borderColor: 'var(--primary-color)',
                                    color: 'var(--primary-color)',
                                    '&:hover': {
                                      borderColor: 'var(--primary-hover-color)',
                                      backgroundColor: 'rgba(25, 118, 210, 0.04)'
                                    }
                                  }}
                                >
                                  Export to PDF
                                </Button>
                                <Button
                                  variant="outlined"
                                  fullWidth
                                  startIcon={<Delete />}
                                  onClick={() => handleDeleteClick(report)}
                                  sx={{
                                    borderColor: '#d32f2f',
                                    color: '#d32f2f',
                                    '&:hover': {
                                      borderColor: '#b71c1c',
                                      backgroundColor: 'rgba(211, 47, 47, 0.04)'
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      </Card>

                      {/* Responsible AI Pillar Evaluations */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          Responsible AI Pillar Evaluations
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<UnfoldMore fontSize="small" />}
                            onClick={() => handleExpandAll(report.id, report.promptPairs)}
                            sx={{
                              fontSize: '0.75rem',
                              py: 0.5,
                              px: 1,
                              borderColor: 'var(--primary-color)',
                              color: 'var(--primary-color)',
                              '&:hover': {
                                borderColor: 'var(--primary-hover-color)',
                                backgroundColor: 'rgba(25, 118, 210, 0.04)'
                              }
                            }}
                          >
                            Expand All
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<UnfoldLess fontSize="small" />}
                            onClick={() => handleCollapseAll(report.id, report.promptPairs)}
                            sx={{
                              fontSize: '0.75rem',
                              py: 0.5,
                              px: 1,
                              borderColor: 'var(--primary-color)',
                              color: 'var(--primary-color)',
                              '&:hover': {
                                borderColor: 'var(--primary-hover-color)',
                                backgroundColor: 'rgba(25, 118, 210, 0.04)'
                              }
                            }}
                          >
                            Collapse All
                          </Button>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {Object.entries(report.promptPairs).map(([category, pairs]) => (
                          <Card key={category} variant="outlined">
                            <Accordion
                              expanded={expandedCategory[`${report.id}-${category}`] || false}
                              onChange={handleCategoryChange(report.id, category)}
                              sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
                            >
                              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, py: 1.5 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                      {category.charAt(0).toUpperCase() + category.slice(1)}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                                      <Chip
                                        label={`${getEvaluatedCount(pairs)}/${pairs.length} evaluated`}
                                        size="small"
                                        color={getEvaluatedCount(pairs) === pairs.length ? 'success' : 'default'}
                                      />
                                      <Chip
                                        label={`Score: ${getCategoryScore(pairs).toFixed(1)}`}
                                        color={getCategoryScore(pairs) >= 4 ? 'success' : getCategoryScore(pairs) >= 3 ? 'warning' : 'error'}
                                        size="small"
                                        sx={{ fontWeight: 'bold' }}
                                      />
                                    </Box>
                                  </Box>
                                  {pillarDefinitions[category.toLowerCase()] && (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', lineHeight: 1.4 }}>
                                      {pillarDefinitions[category.toLowerCase()]}
                                    </Typography>
                                  )}
                                </Box>
                              </AccordionSummary>
                              <AccordionDetails sx={{ px: 2, pb: 2 }}>
                                <TableContainer>
                                  <Table>
                                    <TableHead>
                                      <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Scenario Question</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Application Response</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>AI Considerations</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Human Evaluation</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {pairs.map((pair, index) => (
                                        <TableRow key={pair.question_id || index} hover>
                                          <TableCell sx={{ verticalAlign: 'top' }}>
                                            <Typography variant="body2">
                                              {pair.question}
                                            </Typography>
                                          </TableCell>
                                          <TableCell sx={{ verticalAlign: 'top' }}>
                                            <Typography variant="body2">
                                              {pair.answer}
                                            </Typography>
                                          </TableCell>
                                          <TableCell sx={{ verticalAlign: 'top' }}>
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                              {pair.considerations}
                                            </Typography>
                                          </TableCell>
                                          <TableCell sx={{ verticalAlign: 'top' }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                              <QuestionScoreSlider
                                                questionId={pair.question_id}
                                                reportId={report.id}
                                                currentScore={pair.score || 1}
                                                onScoreChange={handleScoreChange}
                                                disabled={isUpdating}
                                              />

                                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                                                <TextField
                                                  multiline
                                                  rows={4}
                                                  fullWidth
                                                  size="small"
                                                  placeholder="Add evaluation comments..."
                                                  defaultValue={pair.comments || ''}
                                                  inputRef={(ref) => {
                                                    if (ref) {
                                                      commentRefs.current[pair.question_id] = ref;
                                                    }
                                                  }}
                                                  disabled={!editingComments[pair.question_id]}
                                                  sx={{
                                                    '& .MuiInputBase-input.Mui-disabled': {
                                                      WebkitTextFillColor: 'rgba(0, 0, 0, 0.6)',
                                                      backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                                    }
                                                  }}
                                                />
                                                {editingComments[pair.question_id] ? (
                                                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                    <Button
                                                      size="small"
                                                      variant="outlined"
                                                      onClick={() => handleCommentCancel(pair.question_id)}
                                                      sx={{
                                                        minWidth: 'auto',
                                                        borderColor: 'rgba(0, 0, 0, 0.23)',
                                                        color: 'rgba(0, 0, 0, 0.6)',
                                                        '&:hover': {
                                                          borderColor: 'rgba(0, 0, 0, 0.4)',
                                                          backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                                        }
                                                      }}
                                                    >
                                                      Cancel
                                                    </Button>
                                                    <Button
                                                      size="small"
                                                      variant="contained"
                                                      startIcon={<Save fontSize="small" />}
                                                      onClick={() => handleCommentSave(pair.question_id, report.id)}
                                                      sx={{
                                                        backgroundColor: 'var(--primary-color)',
                                                        '&:hover': { backgroundColor: 'var(--primary-hover-color)' }
                                                      }}
                                                    >
                                                      Save
                                                    </Button>
                                                  </Box>
                                                ) : (
                                                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <Button
                                                      size="small"
                                                      variant="outlined"
                                                      startIcon={<Edit fontSize="small" />}
                                                      onClick={() => handleCommentEdit(pair.question_id, pair.comments)}
                                                      sx={{
                                                        minWidth: 'auto',
                                                        borderColor: 'var(--primary-color)',
                                                        color: 'var(--primary-color)',
                                                        '&:hover': {
                                                          borderColor: 'var(--primary-hover-color)',
                                                          backgroundColor: 'rgba(25, 118, 210, 0.04)'
                                                        }
                                                      }}
                                                    >
                                                      Edit
                                                    </Button>
                                                  </Box>
                                                )}
                                              </Box>
                                            </Box>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </AccordionDetails>
                            </Accordion>
                          </Card>
                        ))}
                      </Box>
                    </AccordionDetails>
                  )}
                </Accordion>
              </Card>
            ))}
          </Box>
        )}

        {/* PDF Export Dialog */}
        <Dialog open={exportDialogOpen} onClose={handleExportClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PictureAsPdf color="primary" />
              Export PDF Report
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
              {/* Report Type Selection */}
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontWeight: 600, mb: 1 }}>
                  Report Type
                </FormLabel>
                <RadioGroup
                  value={exportOptions.reportType}
                  onChange={(e) => setExportOptions({ ...exportOptions, reportType: e.target.value })}
                >
                  <FormControlLabel
                    value="summary"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>Summary Report</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Overview, scores, and key metrics only
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="detailed"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>Detailed Report</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Includes all questions, answers, and evaluations
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>

              {/* Content Options */}
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontWeight: 600, mb: 1 }}>
                  Include in Report
                </FormLabel>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={exportOptions.includeChart}
                        onChange={(e) => setExportOptions({ ...exportOptions, includeChart: e.target.checked })}
                      />
                    }
                    label="Performance radar chart"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={exportOptions.includeConfig}
                        onChange={(e) => setExportOptions({ ...exportOptions, includeConfig: e.target.checked })}
                      />
                    }
                    label="Application configuration details"
                  />
                  {exportOptions.reportType === 'detailed' && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportOptions.includeConsiderations}
                          onChange={(e) => setExportOptions({ ...exportOptions, includeConsiderations: e.target.checked })}
                        />
                      }
                      label="AI considerations and analysis"
                    />
                  )}
                </FormGroup>
              </FormControl>

              {selectedReport && (
                <Box sx={{ bgcolor: 'rgba(25, 118, 210, 0.05)', p: 2, borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Report Preview:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedReport.name} (ID: {selectedReport.id})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Generated: {new Date(selectedReport.datetime).toLocaleDateString()}
                  </Typography>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleExportClose}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={generatePDF}
              disabled={isExporting}
              startIcon={isExporting ? <CircularProgress size={16} /> : <Download />}
              sx={{
                backgroundColor: 'var(--primary-color)',
                '&:hover': { backgroundColor: 'var(--primary-hover-color)' }
              }}
            >
              {isExporting ? 'Generating...' : 'Generate PDF'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={successDialog.open} onClose={handleSuccessDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color="success" />
              {successDialog.title}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1">
                {successDialog.message}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleSuccessDialogClose}
              variant="contained"
              sx={{
                backgroundColor: 'var(--primary-color)',
                '&:hover': { backgroundColor: 'var(--primary-hover-color)' }
              }}
            >
              OK
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onClose={handleDeleteCancel} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Delete color="error" />
              Delete Evaluation Result
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Are you sure you want to delete this evaluation result?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                <strong>Report:</strong> {deleteDialog.reportName}
              </Typography>
              <Typography variant="body2" color="error">
                This action cannot be undone. All evaluation data and comments will be permanently deleted.
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
              startIcon={deleting ? <CircularProgress size={16} /> : <Delete />}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Scenario Not Found Dialog */}
        <Dialog
          open={scenarioNotFoundDialog.open}
          onClose={() => setScenarioNotFoundDialog({ open: false, message: '', scenarioId: null })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Cancel color="error" />
            Re-evaluation Not Possible
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {scenarioNotFoundDialog.message}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The scenario (ID: {scenarioNotFoundDialog.scenarioId}) used in the original evaluation
              has been deleted or is no longer available.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setScenarioNotFoundDialog({ open: false, message: '', scenarioId: null })}
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setScenarioNotFoundDialog({ open: false, message: '', scenarioId: null });
                navigate('/evaluate');
              }}
              variant="contained"
              sx={{
                backgroundColor: 'var(--primary-color)',
                '&:hover': { backgroundColor: 'var(--primary-hover-color)' }
              }}
            >
              Run New Evaluation
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default Results;
