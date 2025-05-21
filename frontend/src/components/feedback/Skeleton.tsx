import React from 'react';
import { 
  Skeleton as MuiSkeleton, 
  Box, 
  Grid, 
  Card, 
  CardContent,
  Typography,
  Paper,
  Divider,
  useTheme
} from '@mui/material';

// Basic Skeleton
interface BasicSkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: number | string;
  height?: number | string;
  animation?: 'pulse' | 'wave' | false;
  className?: string;
}

export const BasicSkeleton: React.FC<BasicSkeletonProps> = ({
  variant = 'rectangular',
  width = '100%',
  height = 100,
  animation = 'pulse',
  className,
}) => {
  return (
    <MuiSkeleton
      variant={variant}
      width={width}
      height={height}
      animation={animation}
      className={className}
    />
  );
};

// Text Skeleton with multiple lines
interface TextSkeletonProps {
  lines?: number;
  widths?: (string | number)[];
  animation?: 'pulse' | 'wave' | false;
  lineHeight?: number;
}

export const TextSkeleton: React.FC<TextSkeletonProps> = ({
  lines = 3,
  widths,
  animation = 'pulse',
  lineHeight = 28,
}) => {
  const defaultWidths = ['100%', '80%', '60%', '90%', '70%'];
  
  return (
    <>
      {Array.from(new Array(lines)).map((_, index) => (
        <MuiSkeleton
          key={index}
          variant="text"
          width={widths && widths[index] ? widths[index] : defaultWidths[index % defaultWidths.length]}
          height={lineHeight}
          animation={animation}
        />
      ))}
    </>
  );
};

// Card Skeleton
interface CardSkeletonProps {
  height?: number | string;
  width?: number | string;
  headerHeight?: number;
  contentLines?: number;
  animation?: 'pulse' | 'wave' | false;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  height = 'auto',
  width = '100%',
  headerHeight = 40,
  contentLines = 3,
  animation = 'pulse',
}) => {
  return (
    <Card sx={{ width, height }}>
      <CardContent>
        <MuiSkeleton variant="rectangular" height={headerHeight} animation={animation} />
        <Box sx={{ mt: 1.5 }}>
          <TextSkeleton lines={contentLines} animation={animation} />
        </Box>
      </CardContent>
    </Card>
  );
};

// Dashboard Cards Skeleton
export const DashboardCardsSkeleton: React.FC = () => {
  return (
    <Grid container spacing={3}>
      {Array.from(new Array(3)).map((_, index) => (
        <Grid item xs={12} md={4} key={index}>
          <Paper elevation={3} sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 140 }}>
            <MuiSkeleton variant="text" width="60%" height={28} />
            <MuiSkeleton variant="text" width="40%" height={60} sx={{ mt: 2 }} />
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

// Table Row Skeleton
interface TableRowSkeletonProps {
  rowCount?: number;
  columnCount?: number;
  animation?: 'pulse' | 'wave' | false;
}

export const TableRowSkeleton: React.FC<TableRowSkeletonProps> = ({
  rowCount = 5,
  columnCount = 5,
  animation = 'pulse',
}) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        pb: 1, 
        pt: 2,
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        {Array.from(new Array(columnCount)).map((_, index) => (
          <Box key={index} sx={{ flex: 1 }}>
            <MuiSkeleton variant="text" width="80%" height={24} animation={animation} />
          </Box>
        ))}
      </Box>
      
      {Array.from(new Array(rowCount)).map((_, rowIndex) => (
        <Box key={rowIndex} sx={{ 
          display: 'flex', 
          py: 2, 
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          {Array.from(new Array(columnCount)).map((_, colIndex) => (
            <Box key={colIndex} sx={{ flex: 1 }}>
              <MuiSkeleton variant="text" width="80%" height={24} animation={animation} />
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
};

// Form Skeleton
export const FormSkeleton: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 600, width: '100%', mx: 'auto' }}>
      <MuiSkeleton variant="text" width="60%" height={40} sx={{ mb: 3 }} />
      
      <MuiSkeleton variant="rectangular" height={56} sx={{ mb: 3 }} />
      <MuiSkeleton variant="rectangular" height={56} sx={{ mb: 3 }} />
      <MuiSkeleton variant="rectangular" height={56} sx={{ mb: 3 }} />
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <MuiSkeleton variant="rectangular" width={24} height={24} sx={{ mr: 1 }} />
        <MuiSkeleton variant="text" width="40%" height={24} />
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
        <MuiSkeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
      </Box>
    </Box>
  );
};

// Profile Skeleton
export const ProfileSkeleton: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 800, width: '100%', mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <MuiSkeleton variant="circular" width={80} height={80} sx={{ mr: 2 }} />
        <Box sx={{ flex: 1 }}>
          <MuiSkeleton variant="text" width="30%" height={40} />
          <MuiSkeleton variant="text" width="20%" height={24} />
        </Box>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <MuiSkeleton variant="text" width="50%" height={32} sx={{ mb: 2 }} />
          <MuiSkeleton variant="rectangular" height={56} sx={{ mb: 3 }} />
          <MuiSkeleton variant="rectangular" height={56} sx={{ mb: 3 }} />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <MuiSkeleton variant="text" width="50%" height={32} sx={{ mb: 2 }} />
          <MuiSkeleton variant="rectangular" height={56} sx={{ mb: 3 }} />
          <MuiSkeleton variant="rectangular" height={56} sx={{ mb: 3 }} />
        </Grid>
      </Grid>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <MuiSkeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1, mr: 2 }} />
        <MuiSkeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
      </Box>
    </Box>
  );
};

// Chart Skeleton
export const ChartSkeleton: React.FC<{ height?: number | string }> = ({ height = 300 }) => {
  return (
    <Paper sx={{ p: 3, width: '100%', height }}>
      <MuiSkeleton variant="text" width="30%" height={32} sx={{ mb: 2 }} />
      <MuiSkeleton variant="rectangular" height={`calc(${typeof height === 'number' ? `${height}px` : height} - 80px)`} />
    </Paper>
  );
};
