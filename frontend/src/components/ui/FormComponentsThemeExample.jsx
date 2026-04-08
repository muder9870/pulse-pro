import React, { useState } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import Input from './Input';
import Checkbox from './Checkbox';
import Select from './Select';
import Button from './Button';
import Card from './Card';
import { Mail, Lock, User } from 'lucide-react';

/**
 * Example component demonstrating Input, Checkbox, and Select components
 * with theme token integration for light/dark mode support.
 * 
 * This component can be used to visually test the form components
 * in both light and dark modes.
 */
const FormComponentsThemeExample = () => {
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    country: '',
    newsletter: false,
    terms: false,
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simple validation
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.terms) newErrors.terms = 'You must accept the terms';
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      alert('Form submitted successfully!');
      console.log('Form data:', formData);
    }
  };

  const countryOptions = [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
    { value: 'au', label: 'Australia' },
    { value: 'de', label: 'Germany' },
  ];

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Form Components Theme Example
          </h1>
          <Button onClick={toggleTheme} variant="secondary">
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'} Mode
          </Button>
        </div>

        <p style={{ color: 'var(--color-text-secondary)' }}>
          This example demonstrates Input, Checkbox, and Select components using theme tokens
          for seamless light/dark mode support.
        </p>

        {/* Form Card */}
        <Card variant="elevated">
          <Card.Header>
            <Card.Title>Registration Form</Card.Title>
            <Card.Description>
              Test the form components in both light and dark modes
            </Card.Description>
          </Card.Header>

          <Card.Body>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                icon={Mail}
                iconPosition="left"
                fullWidth
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
                helperText={!errors.email && "We'll never share your email"}
              />

              {/* Username Input */}
              <Input
                label="Username"
                type="text"
                placeholder="johndoe"
                icon={User}
                iconPosition="left"
                fullWidth
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                helperText="Choose a unique username"
              />

              {/* Password Input */}
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={Lock}
                iconPosition="left"
                fullWidth
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={errors.password}
                helperText={!errors.password && "At least 8 characters"}
              />

              {/* Country Select */}
              <Select
                label="Country"
                placeholder="Select your country"
                options={countryOptions}
                fullWidth
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                helperText="Select your country of residence"
              />

              {/* Newsletter Checkbox */}
              <Checkbox
                label="Subscribe to newsletter"
                description="Get updates about new features and releases"
                checked={formData.newsletter}
                onChange={(e) => setFormData({ ...formData, newsletter: e.target.checked })}
              />

              {/* Terms Checkbox */}
              <Checkbox
                label="I accept the terms and conditions"
                description="You must accept the terms to continue"
                checked={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
              />
              {errors.terms && (
                <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
                  {errors.terms}
                </p>
              )}

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" variant="primary" fullWidth>
                  Create Account
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setFormData({
                      email: '',
                      password: '',
                      username: '',
                      country: '',
                      newsletter: false,
                      terms: false,
                    });
                    setErrors({});
                  }}
                >
                  Reset
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>

        {/* Component States Demo */}
        <Card>
          <Card.Header>
            <Card.Title>Component States</Card.Title>
            <Card.Description>
              Different states of form components
            </Card.Description>
          </Card.Header>

          <Card.Body className="space-y-6">
            {/* Input States */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Input States
              </h3>
              <Input label="Normal Input" placeholder="Type something..." fullWidth />
              <Input
                label="Input with Error"
                placeholder="Invalid input"
                error="This field has an error"
                fullWidth
              />
              <Input
                label="Disabled Input"
                placeholder="Cannot edit"
                disabled
                fullWidth
              />
            </div>

            {/* Checkbox States */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Checkbox States
              </h3>
              <Checkbox label="Unchecked" checked={false} onChange={() => {}} />
              <Checkbox label="Checked" checked={true} onChange={() => {}} />
              <Checkbox
                label="Indeterminate"
                indeterminate={true}
                checked={false}
                onChange={() => {}}
              />
              <Checkbox
                label="Disabled"
                checked={false}
                disabled={true}
                onChange={() => {}}
              />
            </div>

            {/* Select States */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Select States
              </h3>
              <Select
                label="Normal Select"
                options={countryOptions}
                fullWidth
              />
              <Select
                label="Select with Error"
                options={countryOptions}
                error="Please select an option"
                fullWidth
              />
              <Select
                label="Disabled Select"
                options={countryOptions}
                disabled
                fullWidth
              />
            </div>
          </Card.Body>
        </Card>

        {/* Theme Token Info */}
        <Card variant="glass">
          <Card.Body>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Theme Tokens Used
            </h3>
            <ul className="space-y-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <li>✓ <code>--color-background</code> - Input/Select background</li>
              <li>✓ <code>--color-border</code> - Borders and outlines</li>
              <li>✓ <code>--color-primary</code> - Focus states and checked checkboxes</li>
              <li>✓ <code>--color-danger</code> - Error messages and states</li>
              <li>✓ <code>--color-text-primary</code> - Labels and input text</li>
              <li>✓ <code>--color-text-secondary</code> - Helper text and icons</li>
            </ul>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default FormComponentsThemeExample;
