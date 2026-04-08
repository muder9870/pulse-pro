import { useState } from 'react';
import { ThemeProvider, useTheme } from '../../theme/ThemeProvider';
import Modal from './Modal';
import Button from './Button';
import { Sun, Moon, Trash2, Save } from 'lucide-react';

/**
 * ModalThemeExample Component
 * 
 * Demonstrates the Modal component working with both light and dark themes.
 * Shows all Modal compound components and theme switching functionality.
 */
function ModalThemeExampleContent() {
  const { theme, toggleTheme } = useTheme();
  const [isBasicOpen, setIsBasicOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="min-h-screen p-8 bg-[var(--color-background)] transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
              Modal Component - Theme Example
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              Demonstrating Modal component with light and dark theme support
            </p>
          </div>
          
          {/* Theme Toggle */}
          <Button
            variant="secondary"
            onClick={toggleTheme}
            icon={theme === 'dark' ? Sun : Moon}
          >
            {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </Button>
        </div>

        {/* Current Theme Info */}
        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Current Theme: <span className="font-semibold text-[var(--color-text-primary)]">{theme}</span>
          </p>
        </div>

        {/* Modal Examples */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Basic Modal */}
          <div className="p-6 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Basic Modal
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Simple modal with header, body, and footer
            </p>
            <Button onClick={() => setIsBasicOpen(true)} fullWidth>
              Open Basic Modal
            </Button>
          </div>

          {/* Confirmation Modal */}
          <div className="p-6 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Confirmation Modal
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Modal with danger action and confirmation
            </p>
            <Button onClick={() => setIsConfirmOpen(true)} variant="danger" fullWidth>
              Open Confirm Modal
            </Button>
          </div>

          {/* Form Modal */}
          <div className="p-6 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Form Modal
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Modal with form inputs and validation
            </p>
            <Button onClick={() => setIsFormOpen(true)} variant="success" fullWidth>
              Open Form Modal
            </Button>
          </div>
        </div>

        {/* Theme Token Reference */}
        <div className="p-6 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Theme Tokens Used
          </h3>
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Background:</span>
              <code className="px-2 py-1 rounded bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-primary)]">
                var(--color-background)
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Surface:</span>
              <code className="px-2 py-1 rounded bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-primary)]">
                var(--color-surface)
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Border:</span>
              <code className="px-2 py-1 rounded bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-primary)]">
                var(--color-border)
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Text Primary:</span>
              <code className="px-2 py-1 rounded bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-primary)]">
                var(--color-text-primary)
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Text Secondary:</span>
              <code className="px-2 py-1 rounded bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-primary)]">
                var(--color-text-secondary)
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Modal */}
      <Modal open={isBasicOpen} onClose={() => setIsBasicOpen(false)} size="md">
        <Modal.Header>
          <Modal.Title>Welcome to the Modal</Modal.Title>
          <Modal.Description>
            This is a basic modal demonstrating theme token integration
          </Modal.Description>
        </Modal.Header>
        
        <Modal.Body>
          <div className="space-y-4">
            <p className="text-[var(--color-text-primary)]">
              This modal automatically adapts to the current theme. Try toggling between light and dark modes to see the colors change seamlessly.
            </p>
            <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-text-secondary)]">
                All colors are defined using CSS variables from the theme system, ensuring consistent styling across all components.
              </p>
            </div>
          </div>
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setIsBasicOpen(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={() => setIsBasicOpen(false)}>
            Got it
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirmation Modal */}
      <Modal open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} size="sm">
        <Modal.Header>
          <Modal.Title>Delete Item</Modal.Title>
          <Modal.Description>
            Are you sure you want to delete this item? This action cannot be undone.
          </Modal.Description>
        </Modal.Header>
        
        <Modal.Body>
          <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-primary)] font-medium">
              Item: Example Document.pdf
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              Created: January 15, 2024
            </p>
          </div>
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setIsConfirmOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            icon={Trash2}
            onClick={() => {
              alert('Item deleted!');
              setIsConfirmOpen(false);
            }}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Form Modal */}
      <Modal open={isFormOpen} onClose={() => setIsFormOpen(false)} size="md">
        <Modal.Header>
          <Modal.Title>Create New Item</Modal.Title>
          <Modal.Description>
            Fill out the form below to create a new item
          </Modal.Description>
        </Modal.Header>
        
        <Modal.Body>
          <div className="space-y-4">
            <div>
              <label 
                htmlFor="item-name" 
                className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
              >
                Item Name
              </label>
              <input
                id="item-name"
                type="text"
                placeholder="Enter item name"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
            
            <div>
              <label 
                htmlFor="item-description" 
                className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
              >
                Description
              </label>
              <textarea
                id="item-description"
                rows={3}
                placeholder="Enter description"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
              />
            </div>
            
            <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-secondary)]">
                Note: All form inputs also use theme tokens for consistent styling
              </p>
            </div>
          </div>
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            icon={Save}
            onClick={() => {
              alert('Item created!');
              setIsFormOpen(false);
            }}
          >
            Create Item
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

/**
 * Wrapper component with ThemeProvider
 */
export default function ModalThemeExample() {
  return (
    <ThemeProvider>
      <ModalThemeExampleContent />
    </ThemeProvider>
  );
}
