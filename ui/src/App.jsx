import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme, Box } from '@mui/material';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Evaluate from './pages/Evaluate';
import Results from './pages/Results';
import NewScenario from './pages/NewScenario';
import ManageScenarios from './pages/ManageScenarios';
import EditScenarios from './pages/EditScenarios';

const theme = createTheme({
  palette: {
    background: {
      default: '#ffffff'
    }
  }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <TopBar />
        <Box sx={{ display: 'flex' }}>
          <Sidebar />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              minHeight: '100vh',
              bgcolor: 'background.default',
              mt: '64px' // Account for top bar height
            }}
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/evaluate" element={<Evaluate />} />
              <Route path="/results" element={<Results />} />
              <Route path="/new-scenario" element={<NewScenario />} />
              <Route path="/manage-scenarios" element={<ManageScenarios />} />
              <Route path="/edit-scenarios/:scenarioId" element={<EditScenarios />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  )
}

export default App
