import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useDataMigration, MigrationProgress } from '../hooks/useDataMigration';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Database, 
  Settings, 
  User, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

/**
 * Data Migration Component
 * 
 * Provides UI for migrating data from old frontend format:
 * - Migration status display
 * - Progress tracking
 * - Error handling
 * - Rollback functionality
 */
const DataMigration = ({ onComplete, onError }) => {
  const {
    migrationStatus,
    migrationProgress,
    migrationErrors,
    migrationResults,
    migrationNeeded,
    startMigration,
    rollbackMigration,
    resetMigration,
  } = useDataMigration();

  const [showDetails, setShowDetails] = useState(false);

  // Auto-start migration if needed
  useEffect(() => {
    if (migrationNeeded === true && migrationStatus === 'idle') {
      // Auto-start migration
      startMigration();
    }
  }, [migrationNeeded, migrationStatus, startMigration]);

  // Handle completion
  useEffect(() => {
    if (migrationStatus === 'completed' && migrationResults) {
      onComplete?.(migrationResults);
    }
  }, [migrationStatus, migrationResults, onComplete]);

  // Handle errors
  useEffect(() => {
    if (migrationStatus === 'error' && migrationErrors.length > 0) {
      onError?.(migrationErrors);
    }
  }, [migrationStatus, migrationErrors, onError]);

  if (!migrationNeeded) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div>
            <h3 className="font-medium text-gray-900">Migration Not Required</h3>
            <p className="text-sm text-gray-500">Your data is already in the correct format.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Migration Progress Modal */}
      <MigrationProgress 
        migrationStatus={migrationStatus}
        migrationProgress={migrationProgress}
        migrationErrors={migrationErrors}
      />

      {/* Migration Status Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Data Migration</h2>
              <p className="text-sm text-gray-500">
                Migrating data from old frontend format
              </p>
            </div>
          </div>
          
          <Badge 
            variant={migrationStatus === 'completed' ? 'success' : 
                     migrationStatus === 'error' ? 'danger' : 
                     migrationStatus === 'running' ? 'warning' : 'secondary'}
          >
            {migrationStatus === 'idle' ? 'Ready' :
             migrationStatus === 'running' ? 'In Progress' :
             migrationStatus === 'completed' ? 'Completed' :
             migrationStatus === 'error' ? 'Failed' : migrationStatus}
          </Badge>
        </div>

        {/* Migration Steps */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              migrationProgress >= 25 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {migrationProgress >= 25 ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">Stories Migration</span>
                <span className="text-sm text-gray-500">25%</span>
              </div>
              <p className="text-sm text-gray-500">
                Migrating story data and metadata
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              migrationProgress >= 50 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {migrationProgress >= 50 ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">User Preferences</span>
                <span className="text-sm text-gray-500">50%</span>
              </div>
              <p className="text-sm text-gray-500">
                Migrating user settings and preferences
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              migrationProgress >= 75 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {migrationProgress >= 75 ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">Settings Migration</span>
                <span className="text-sm text-gray-500">75%</span>
              </div>
              <p className="text-sm text-gray-500">
                Migrating application settings
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              migrationProgress >= 100 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {migrationProgress >= 100 ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">Validation</span>
                <span className="text-sm text-gray-500">100%</span>
              </div>
              <p className="text-sm text-gray-500">
                Validating migrated data integrity
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
            
            {migrationStatus === 'error' && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetMigration}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
          </div>

          {migrationStatus === 'idle' && (
            <Button onClick={startMigration}>
              <Database className="w-4 h-4 mr-2" />
              Start Migration
            </Button>
          )}

          {migrationStatus === 'completed' && (
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={rollbackMigration}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Rollback
              </Button>
              <Button onClick={() => onComplete?.(migrationResults)}>
                Continue
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Migration Details */}
      {showDetails && migrationResults && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Migration Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stories Results */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-blue-500" />
                <h4 className="font-medium">Stories</h4>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Migrated</span>
                  <span className="font-medium">{migrationResults.stories.migrated || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Failed</span>
                  <span className="font-medium text-red-600">{migrationResults.stories.failed || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Skipped</span>
                  <span className="font-medium text-yellow-600">{migrationResults.stories.skipped || 0}</span>
                </div>
              </div>
            </div>

            {/* Preferences Results */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-green-500" />
                <h4 className="font-medium">Preferences</h4>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Migrated</span>
                  <span className="font-medium">{migrationResults.preferences.migrated || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Failed</span>
                  <span className="font-medium text-red-600">{migrationResults.preferences.failed || 0}</span>
                </div>
              </div>
            </div>

            {/* Settings Results */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-purple-500" />
                <h4 className="font-medium">Settings</h4>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Migrated</span>
                  <span className="font-medium">{migrationResults.settings.migrated || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Failed</span>
                  <span className="font-medium text-red-600">{migrationResults.settings.failed || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Results */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-2 mb-3">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <h4 className="font-medium">Validation Results</h4>
            </div>
            
            <div className="space-y-2">
              {migrationResults.validation.issues?.length > 0 ? (
                migrationResults.validation.issues.map((issue, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-gray-600">{issue}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600">All data validated successfully</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Error Display */}
      {migrationStatus === 'error' && migrationErrors.length > 0 && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="font-medium text-red-900">Migration Errors</h3>
          </div>
          
          <div className="space-y-2">
            {migrationErrors.map((error, index) => (
              <div key={index} className="text-sm text-red-700">
                {error}
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-red-200">
            <p className="text-sm text-red-600">
              Please check the error messages above and try again. If the problem persists, 
              contact support or consider manually migrating your data.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DataMigration;
