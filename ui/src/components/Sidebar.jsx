import { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Divider,
  Typography
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Home as HomeIcon,
  Assessment as AssessmentIcon,
  BarChart as ResultsIcon,
  Add as AddIcon,
  Settings as ManageIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const DRAWER_WIDTH = 240;
const COLLAPSED_WIDTH = 64;

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  const menuGroups = [
    {
      heading: 'Navigation',
      items: [
        {
          text: 'Home',
          icon: <HomeIcon />,
          path: '/'
        }
      ]
    },
    {
      heading: 'Scenarios',
      items: [
        {
          text: 'New Scenario',
          icon: <AddIcon />,
          path: '/new-scenario'
        },
        {
          text: 'Manage Scenarios',
          icon: <ManageIcon />,
          path: '/manage-scenarios'
        }
      ]
    },
    {
      heading: 'Evaluation',
      items: [
        {
          text: 'Evaluate',
          icon: <AssessmentIcon />,
          path: '/evaluate'
        },
        {
          text: 'Results',
          icon: <ResultsIcon />,
          path: '/results'
        }
      ]
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: isOpen ? DRAWER_WIDTH : COLLAPSED_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: isOpen ? DRAWER_WIDTH : COLLAPSED_WIDTH,
          boxSizing: 'border-box',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
          bgcolor: 'var(--primary-color)',
          color: 'white',
          mt: '64px' // Account for top bar height
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isOpen ? 'flex-end' : 'center',
          p: 1,
          minHeight: 48
        }}
      >
        <IconButton
          onClick={toggleDrawer}
          sx={{ 
            color: 'white',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
          }}
        >
          {isOpen ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Box>
      
      <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
      
      <List sx={{ pt: 2 }}>
        {menuGroups.map((group, groupIndex) => (
          <Box key={group.heading}>
            {/* Group Heading */}
            {isOpen && (
              <Typography
                variant="overline"
                sx={{
                  px: 2.5,
                  py: 1,
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.1em'
                }}
              >
                {group.heading}
              </Typography>
            )}
            
            {/* Group Items */}
            {group.items.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  selected={location.pathname === item.path}
                  sx={{
                    minHeight: 48,
                    justifyContent: isOpen ? 'initial' : 'center',
                    px: 2.5,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.3)',
                      }
                    },
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isOpen ? 3 : 'auto',
                      justifyContent: 'center',
                      color: 'white'
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    sx={{ 
                      opacity: isOpen ? 1 : 0,
                      '& .MuiListItemText-primary': {
                        fontWeight: 500
                      }
                    }} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
            
            {/* Divider between groups (except for the last group) */}
            {groupIndex < menuGroups.length - 1 && (
              <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', my: 1 }} />
            )}
          </Box>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;