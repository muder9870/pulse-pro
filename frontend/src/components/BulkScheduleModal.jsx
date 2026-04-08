import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

/**
 * BulkScheduleModal Component
 * Modal for scheduling multiple articles to a platform at a specific time
 */
const BulkScheduleModal = ({ open, onClose, onSchedule, selectedCount }) => {
  const [scheduleTime, setScheduleTime] = useState('');
  const [schedulePlatform, setSchedulePlatform] = useState('twitter');
  
  const handleSchedule = () => {
    if (!scheduleTime) return;
    
    onSchedule({
      time: scheduleTime,
      platform: schedulePlatform,
    });
    
    // Reset form
    setScheduleTime('');
    setSchedulePlatform('twitter');
  };
  
  const handleClose = () => {
    // Reset form on close
    setScheduleTime('');
    setSchedulePlatform('twitter');
    onClose();
  };
  
  return (
    <Modal open={open} onClose={handleClose} size="sm">
      <Modal.Header>
        <Modal.Title>
          Schedule {selectedCount} {selectedCount === 1 ? 'Article' : 'Articles'}
        </Modal.Title>
        <Modal.Description>
          Choose a time and platform for bulk scheduling
        </Modal.Description>
      </Modal.Header>
      
      <Modal.Body>
        <div className="space-y-4">
          {/* Platform Selector */}
          <Select
            id="schedule-platform"
            label="Platform"
            value={schedulePlatform}
            onChange={(e) => setSchedulePlatform(e.target.value)}
            options={[
              { value: 'twitter', label: 'Twitter' },
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'facebook', label: 'Facebook' },
              { value: 'instagram', label: 'Instagram' }
            ]}
            fullWidth
          />
          
          {/* Date/Time Picker */}
          <Input
            id="schedule-time"
            type="datetime-local"
            label="Schedule Time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            fullWidth
          />
          
          {/* Article Count Info */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <p className="text-sm text-indigo-900">
              <span className="font-semibold">{selectedCount}</span>{' '}
              {selectedCount === 1 ? 'article' : 'articles'} will be scheduled for{' '}
              <span className="font-semibold capitalize">{schedulePlatform}</span>
            </p>
          </div>
        </div>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSchedule}
          icon={Calendar}
          disabled={!scheduleTime}
        >
          Schedule All
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default BulkScheduleModal;
