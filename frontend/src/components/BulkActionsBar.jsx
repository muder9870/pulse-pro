import React, { useState } from 'react';
import {
  X,
  Trash2,
  Download,
  Tag,
  Send,
  Calendar,
  CheckCircle,
  Sparkles,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { Button, Modal } from './ui';
import BulkScheduleModal from './BulkScheduleModal';
import BulkTagModal from './BulkTagModal';

/**
 * BulkActionsBar Component
 * Floating action bar that appears when items are selected
 */
const BulkActionsBar = ({
  selectedCount,
  onClearSelection,
  onBulkGenerate,
  onBulkSchedule,
  onBulkExport,
  onBulkTag,
  onBulkDelete,
  onBulkMarkPosted,
  showTagModal,
  setShowTagModal,
  showScheduleModal,
  setShowScheduleModal,
  disabled = false,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (selectedCount === 0) return null;

  const handleBulkTag = (tagArray) => {
    onBulkTag(tagArray);
    setShowTagModal(false);
  };

  const handleBulkSchedule = (scheduleData) => {
    onBulkSchedule(scheduleData);
    setShowScheduleModal(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onBulkDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300 pb-safe">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 px-6 py-4 flex items-center gap-4 max-w-[95vw] overflow-x-auto sm:overflow-visible">
          {/* Selection Info */}
          <div className="flex items-center gap-3 pr-4 border-r border-gray-200 dark:border-slate-700">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
              </p>
              <button
                onClick={onClearSelection}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                Clear selection
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={Sparkles}
              onClick={onBulkGenerate}
              disabled={disabled}
              title="Generate content for selected articles"
            >
              Generate
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={Calendar}
              onClick={() => setShowScheduleModal(true)}
              disabled={disabled}
              title="Schedule selected articles"
            >
              Schedule
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={Tag}
              onClick={() => setShowTagModal(true)}
              disabled={disabled}
              title="Add tags to selected articles"
            >
              Tag
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={Download}
              onClick={onBulkExport}
              disabled={disabled}
              title="Export selected articles"
            >
              Export
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={Send}
              onClick={onBulkMarkPosted}
              disabled={disabled}
              title="Mark as posted"
            >
              Mark Posted
            </Button>

            <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={handleDeleteClick}
              disabled={disabled}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
              title="Delete selected articles"
            >
              Delete
            </Button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClearSelection}
            className="ml-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tag Modal */}
      <BulkTagModal
        open={showTagModal}
        onClose={() => setShowTagModal(false)}
        onTag={handleBulkTag}
        selectedCount={selectedCount}
      />

      {/* Schedule Modal */}
      <BulkScheduleModal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleBulkSchedule}
        selectedCount={selectedCount}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Delete {selectedCount} {selectedCount === 1 ? 'Article' : 'Articles'}?
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            This action cannot be undone. All selected articles and their generated content will be permanently removed.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              icon={Trash2}
            >
              Delete {selectedCount} {selectedCount === 1 ? 'Article' : 'Articles'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BulkActionsBar;
