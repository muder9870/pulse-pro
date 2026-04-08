import React from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import Card from './Card';
import Button from './Button';
import { User, Mail, Phone, MapPin, Calendar, Star } from 'lucide-react';

/**
 * Example component demonstrating Card component with theme tokens
 * Shows all variants in both light and dark modes
 */
const CardThemeExample = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="p-8 space-y-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Card Component - Theme Integration
        </h1>
        
        <div className="flex items-center gap-4">
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            Current theme: <strong>{theme}</strong>
          </p>
          
          <Button onClick={toggleTheme} variant="primary">
            Toggle Theme
          </Button>
        </div>
      </div>

      {/* All Variants */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          All Card Variants
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          All variants now use theme tokens and adapt to light/dark mode automatically.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="default">
            <Card.Header>
              <Card.Title>Default Card</Card.Title>
              <Card.Description>Surface background with border</Card.Description>
            </Card.Header>
            <Card.Content>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Uses --color-surface and --color-border theme tokens.
              </p>
            </Card.Content>
          </Card>

          <Card variant="elevated">
            <Card.Header>
              <Card.Title>Elevated Card</Card.Title>
              <Card.Description>Surface with shadow effect</Card.Description>
            </Card.Header>
            <Card.Content>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Adds shadow for depth and elevation.
              </p>
            </Card.Content>
          </Card>

          <Card variant="glass">
            <Card.Header>
              <Card.Title>Glass Card</Card.Title>
              <Card.Description>Glassmorphism effect</Card.Description>
            </Card.Header>
            <Card.Content>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Semi-transparent with backdrop blur.
              </p>
            </Card.Content>
          </Card>

          <Card variant="dark">
            <Card.Header>
              <Card.Title>Dark Card</Card.Title>
              <Card.Description>Dark background variant</Card.Description>
            </Card.Header>
            <Card.Content>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Uses background color with transparency.
              </p>
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* Padding Variants */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Card Padding Options
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card padding="sm">
            <Card.Title>Small Padding</Card.Title>
            <Card.Description>Compact spacing (12px)</Card.Description>
          </Card>

          <Card padding="md">
            <Card.Title>Medium Padding</Card.Title>
            <Card.Description>Default spacing (20px)</Card.Description>
          </Card>

          <Card padding="lg">
            <Card.Title>Large Padding</Card.Title>
            <Card.Description>Spacious layout (32px)</Card.Description>
          </Card>
        </div>
      </div>

      {/* Hover Effect */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Interactive Cards with Hover Effect
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="elevated" hover>
            <Card.Header>
              <Card.Title>Hover Me</Card.Title>
              <Card.Description>Card with hover animation</Card.Description>
            </Card.Header>
            <Card.Content>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Lifts up and shows shadow on hover.
              </p>
            </Card.Content>
          </Card>

          <Card variant="elevated" hover>
            <Card.Header>
              <Card.Title>Interactive</Card.Title>
              <Card.Description>Clickable card effect</Card.Description>
            </Card.Header>
            <Card.Content>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Perfect for navigation cards.
              </p>
            </Card.Content>
          </Card>

          <Card variant="elevated" hover>
            <Card.Header>
              <Card.Title>Animated</Card.Title>
              <Card.Description>Smooth transitions</Card.Description>
            </Card.Header>
            <Card.Content>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                200ms transition duration.
              </p>
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* Complete Card Structure */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Complete Card Structure
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="elevated">
            <Card.Header>
              <Card.Title>User Profile</Card.Title>
              <Card.Description>Complete card with all sections</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <span style={{ color: 'var(--color-text-primary)' }}>John Doe</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <span style={{ color: 'var(--color-text-primary)' }}>john@example.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <span style={{ color: 'var(--color-text-primary)' }}>+1 234 567 8900</span>
                </div>
              </div>
            </Card.Content>
            <Card.Footer>
              <div className="flex gap-2">
                <Button variant="primary" size="sm">Edit Profile</Button>
                <Button variant="secondary" size="sm">View Details</Button>
              </div>
            </Card.Footer>
          </Card>

          <Card variant="elevated">
            <Card.Header>
              <Card.Title>Event Details</Card.Title>
              <Card.Description>Upcoming conference</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <span style={{ color: 'var(--color-text-primary)' }}>March 15, 2024</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <span style={{ color: 'var(--color-text-primary)' }}>San Francisco, CA</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" style={{ color: 'var(--color-warning)' }} />
                  <span style={{ color: 'var(--color-text-primary)' }}>Featured Event</span>
                </div>
              </div>
            </Card.Content>
            <Card.Footer>
              <Button variant="success" size="sm" fullWidth>Register Now</Button>
            </Card.Footer>
          </Card>
        </div>
      </div>

      {/* Nested Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Nested Cards
        </h2>
        
        <Card variant="elevated" padding="lg">
          <Card.Header>
            <Card.Title>Dashboard Overview</Card.Title>
            <Card.Description>Multiple cards in a container</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="default" padding="sm">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                    1,234
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Total Users
                  </p>
                </div>
              </Card>
              
              <Card variant="default" padding="sm">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
                    567
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Active Now
                  </p>
                </div>
              </Card>
              
              <Card variant="default" padding="sm">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-warning)' }}>
                    89
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Pending
                  </p>
                </div>
              </Card>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Theme Features */}
      <Card
        variant="elevated"
        padding="lg"
        style={{ borderLeft: '4px solid var(--color-primary)' }}
      >
        <Card.Header>
          <Card.Title>Theme Integration Features</Card.Title>
          <Card.Description>What's new in the Card component</Card.Description>
        </Card.Header>
        <Card.Content>
          <ul className="space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
            <li>✓ All colors use CSS variables from theme tokens</li>
            <li>✓ Automatic adaptation to light/dark mode</li>
            <li>✓ Smooth color transitions (200ms)</li>
            <li>✓ WCAG 2.1 AA compliant contrast ratios</li>
            <li>✓ Invalid variant fallback with development warnings</li>
            <li>✓ Consistent styling across all card sub-components</li>
            <li>✓ Theme-aware borders, backgrounds, and text colors</li>
          </ul>
        </Card.Content>
      </Card>

      {/* Color Reference */}
      <Card variant="elevated" padding="lg">
        <Card.Header>
          <Card.Title>Theme Color Reference</Card.Title>
          <Card.Description>Current theme colors used by cards</Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'surface', label: 'Surface' },
              { key: 'background', label: 'Background' },
              { key: 'border', label: 'Border' },
              { key: 'text-primary', label: 'Text Primary' },
              { key: 'text-secondary', label: 'Text Secondary' },
              { key: 'primary', label: 'Primary' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded border"
                  style={{
                    backgroundColor: `var(--color-${key})`,
                    borderColor: 'var(--color-border)',
                  }}
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {label}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    --color-{key}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default CardThemeExample;
