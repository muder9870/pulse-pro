import React from 'react';
import { ThemeProvider } from '../../theme/ThemeProvider';
import Stack from './Stack';
import Button from './Button';
import Card from './Card';

/**
 * Stack Component Theme Integration Examples
 * 
 * Demonstrates the Stack component using theme spacing tokens
 * in both light and dark modes.
 */
const StackThemeExample = () => {
  return (
    <div className="p-8 space-y-12">
      <h1 className="text-3xl font-bold mb-8">Stack Component Examples</h1>
      
      {/* Light Mode Examples */}
      <ThemeProvider defaultTheme="light">
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Light Mode</h2>
          
          {/* Vertical Stack */}
          <div>
            <h3 className="text-lg font-medium mb-3">Vertical Stack (Default)</h3>
            <Stack spacing="md">
              <Button variant="primary">First Button</Button>
              <Button variant="secondary">Second Button</Button>
              <Button variant="success">Third Button</Button>
            </Stack>
          </div>
          
          {/* Horizontal Stack */}
          <div>
            <h3 className="text-lg font-medium mb-3">Horizontal Stack</h3>
            <Stack direction="horizontal" spacing="sm">
              <Button variant="primary">Save</Button>
              <Button variant="secondary">Cancel</Button>
              <Button variant="danger">Delete</Button>
            </Stack>
          </div>
          
          {/* Different Spacing */}
          <div>
            <h3 className="text-lg font-medium mb-3">Spacing Variants</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Extra Small (xs - 4px)</p>
                <Stack direction="horizontal" spacing="xs">
                  <Button size="sm">A</Button>
                  <Button size="sm">B</Button>
                  <Button size="sm">C</Button>
                </Stack>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Small (sm - 8px)</p>
                <Stack direction="horizontal" spacing="sm">
                  <Button size="sm">A</Button>
                  <Button size="sm">B</Button>
                  <Button size="sm">C</Button>
                </Stack>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Medium (md - 16px)</p>
                <Stack direction="horizontal" spacing="md">
                  <Button size="sm">A</Button>
                  <Button size="sm">B</Button>
                  <Button size="sm">C</Button>
                </Stack>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Large (lg - 24px)</p>
                <Stack direction="horizontal" spacing="lg">
                  <Button size="sm">A</Button>
                  <Button size="sm">B</Button>
                  <Button size="sm">C</Button>
                </Stack>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Extra Large (xl - 32px)</p>
                <Stack direction="horizontal" spacing="xl">
                  <Button size="sm">A</Button>
                  <Button size="sm">B</Button>
                  <Button size="sm">C</Button>
                </Stack>
              </div>
            </div>
          </div>
          
          {/* Alignment Examples */}
          <div>
            <h3 className="text-lg font-medium mb-3">Alignment Options</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Align Start</p>
                <Stack direction="horizontal" spacing="md" align="start" className="h-24 bg-gray-100 p-4">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </Stack>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Align Center</p>
                <Stack direction="horizontal" spacing="md" align="center" className="h-24 bg-gray-100 p-4">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </Stack>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Align End</p>
                <Stack direction="horizontal" spacing="md" align="end" className="h-24 bg-gray-100 p-4">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </Stack>
              </div>
            </div>
          </div>
          
          {/* Justify Examples */}
          <div>
            <h3 className="text-lg font-medium mb-3">Justify Options</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Justify Start</p>
                <Stack direction="horizontal" spacing="md" justify="start" className="bg-gray-100 p-4">
                  <Button size="sm">A</Button>
                  <Button size="sm">B</Button>
                  <Button size="sm">C</Button>
                </Stack>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Justify Center</p>
                <Stack direction="horizontal" spacing="md" justify="center" className="bg-gray-100 p-4">
                  <Button size="sm">A</Button>
                  <Button size="sm">B</Button>
                  <Button size="sm">C</Button>
                </Stack>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Justify End</p>
                <Stack direction="horizontal" spacing="md" justify="end" className="bg-gray-100 p-4">
                  <Button size="sm">A</Button>
                  <Button size="sm">B</Button>
                  <Button size="sm">C</Button>
                </Stack>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Justify Between</p>
                <Stack direction="horizontal" spacing="md" justify="between" className="bg-gray-100 p-4">
                  <Button size="sm">A</Button>
                  <Button size="sm">B</Button>
                  <Button size="sm">C</Button>
                </Stack>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Justify Around</p>
                <Stack direction="horizontal" spacing="md" justify="around" className="bg-gray-100 p-4">
                  <Button size="sm">A</Button>
                  <Button size="sm">B</Button>
                  <Button size="sm">C</Button>
                </Stack>
              </div>
            </div>
          </div>
          
          {/* Wrap Example */}
          <div>
            <h3 className="text-lg font-medium mb-3">Wrap Behavior</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">No Wrap (Default)</p>
                <Stack direction="horizontal" spacing="sm" wrap={false} className="bg-gray-100 p-4 w-96">
                  <Button size="sm">Button 1</Button>
                  <Button size="sm">Button 2</Button>
                  <Button size="sm">Button 3</Button>
                  <Button size="sm">Button 4</Button>
                  <Button size="sm">Button 5</Button>
                </Stack>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">With Wrap</p>
                <Stack direction="horizontal" spacing="sm" wrap={true} className="bg-gray-100 p-4 w-96">
                  <Button size="sm">Button 1</Button>
                  <Button size="sm">Button 2</Button>
                  <Button size="sm">Button 3</Button>
                  <Button size="sm">Button 4</Button>
                  <Button size="sm">Button 5</Button>
                </Stack>
              </div>
            </div>
          </div>
          
          {/* Nested Stacks */}
          <div>
            <h3 className="text-lg font-medium mb-3">Nested Stacks</h3>
            <Card>
              <Stack spacing="lg">
                <div>
                  <h4 className="font-semibold mb-2">User Profile</h4>
                  <Stack spacing="sm">
                    <p className="text-sm">Name: John Doe</p>
                    <p className="text-sm">Email: john@example.com</p>
                    <p className="text-sm">Role: Administrator</p>
                  </Stack>
                </div>
                
                <Stack direction="horizontal" spacing="md" justify="end">
                  <Button variant="secondary" size="sm">Cancel</Button>
                  <Button variant="primary" size="sm">Save Changes</Button>
                </Stack>
              </Stack>
            </Card>
          </div>
        </section>
      </ThemeProvider>
      
      {/* Dark Mode Examples */}
      <ThemeProvider defaultTheme="dark">
        <section className="space-y-6 bg-slate-900 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold text-white">Dark Mode</h2>
          
          {/* Vertical Stack */}
          <div>
            <h3 className="text-lg font-medium mb-3 text-white">Vertical Stack</h3>
            <Stack spacing="md">
              <Button variant="primary">First Button</Button>
              <Button variant="secondary">Second Button</Button>
              <Button variant="success">Third Button</Button>
            </Stack>
          </div>
          
          {/* Horizontal Stack */}
          <div>
            <h3 className="text-lg font-medium mb-3 text-white">Horizontal Stack</h3>
            <Stack direction="horizontal" spacing="sm">
              <Button variant="primary">Save</Button>
              <Button variant="secondary">Cancel</Button>
              <Button variant="danger">Delete</Button>
            </Stack>
          </div>
          
          {/* Card with Stack */}
          <div>
            <h3 className="text-lg font-medium mb-3 text-white">Card with Stack Layout</h3>
            <Card>
              <Stack spacing="md">
                <h4 className="font-semibold">Settings</h4>
                <Stack spacing="sm">
                  <p className="text-sm">Enable notifications</p>
                  <p className="text-sm">Auto-save changes</p>
                  <p className="text-sm">Dark mode enabled</p>
                </Stack>
                <Stack direction="horizontal" spacing="md" justify="end">
                  <Button variant="ghost" size="sm">Reset</Button>
                  <Button variant="primary" size="sm">Apply</Button>
                </Stack>
              </Stack>
            </Card>
          </div>
        </section>
      </ThemeProvider>
    </div>
  );
};

export default StackThemeExample;
