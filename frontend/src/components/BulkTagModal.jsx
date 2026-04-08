import React, { useState } from 'react';
import { Tag } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

/**
 * BulkTagModal Component
 * Modal for adding tags to multiple articles at once
 */
const BulkTagModal = ({ open, onClose, onTag, selectedCount }) => {
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  
  const validateTags = (tagString) => {
    if (!tagString.trim()) {
      return 'Please enter at least one tag';
    }
    
    // Split by comma and validate each tag
    const tagArray = tagString.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    if (tagArray.length === 0) {
      return 'Please enter at least one valid tag';
    }
    
    // Check for invalid characters (tags should be alphanumeric with hyphens/underscores)
    const invalidTags = tagArray.filter(tag => !/^[a-zA-Z0-9-_\s]+$/.test(tag));
    if (invalidTags.length > 0) {
      return `Invalid tag format: "${invalidTags[0]}". Tags should contain only letters, numbers, hyphens, and underscores.`;
    }
    
    // Check for excessively long tags
    const longTags = tagArray.filter(tag => tag.length > 50);
    if (longTags.length > 0) {
      return `Tag too long: "${longTags[0]}". Tags should be 50 characters or less.`;
    }
    
    return null;
  };
  
  const handleTagChange = (e) => {
    setTags(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };
  
  const handleTag = () => {
    const validationError = validateTags(tags);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    // Parse tags into array
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    onTag(tagArray);
    
    // Reset form
    setTags('');
    setError('');
  };
  
  const handleClose = () => {
    // Reset form on close
    setTags('');
    setError('');
    onClose();
  };
  
  // Parse current tags for preview
  const parsedTags = tags
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag);
  
  return (
    <Modal open={open} onClose={handleClose} size="sm">
      <Modal.Header>
        <Modal.Title>
          Add Tags to {selectedCount} {selectedCount === 1 ? 'Article' : 'Articles'}
        </Modal.Title>
        <Modal.Description>
          Enter comma-separated tags to add to all selected articles
        </Modal.Description>
      </Modal.Header>
      
      <Modal.Body>
        <div className="space-y-4">
          {/* Tag Input */}
          <div>
            <Input
              id="tag-input"
              type="text"
              label="Tags"
              value={tags}
              onChange={handleTagChange}
              placeholder="e.g., technology, ai, innovation"
              error={error}
              helperText={!error ? "Separate multiple tags with commas" : undefined}
              fullWidth
            />
          </div>
          
          {/* Tag Preview */}
          {parsedTags.length > 0 && !error && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview ({parsedTags.length} {parsedTags.length === 1 ? 'tag' : 'tags'})
              </label>
              <div className="flex flex-wrap gap-2">
                {parsedTags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Article Count Info */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <p className="text-sm text-indigo-900">
              {parsedTags.length > 0 ? (
                <>
                  <span className="font-semibold">{parsedTags.length}</span>{' '}
                  {parsedTags.length === 1 ? 'tag' : 'tags'} will be added to{' '}
                  <span className="font-semibold">{selectedCount}</span>{' '}
                  {selectedCount === 1 ? 'article' : 'articles'}
                </>
              ) : (
                <>
                  Tags will be added to{' '}
                  <span className="font-semibold">{selectedCount}</span>{' '}
                  {selectedCount === 1 ? 'article' : 'articles'}
                </>
              )}
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
          onClick={handleTag}
          icon={Tag}
          disabled={!tags.trim()}
        >
          Add Tags
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default BulkTagModal;
