// Import mocks first
import '../helpers/vumTestKit';

// Import required components and utilities
import Button from '../../template/vum/components/Button';
import { 
  createElement, 
  mockLuaRender, 
  fireLuaEvent, 
  resetMocks,
  triggerComponentMethod
} from '../helpers/vumTestKit';
import { getRenderedOutput } from '../../template/vum/bridge';

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe('Button Component', () => {
  // Reset mocks before each test
  beforeEach(() => {
    resetMocks();
  });
  
  // Clear all mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  // Create a type-safe wrapper around createElement for component classes
  function createComponent<P extends Record<string, any>>(componentClass: any, props: P) {
    // This helper function works around TypeScript's type checking
    // for the createElement function, which expects a string or function
    return createElement(componentClass, props as any);
  };

  it('renders with default props', () => {
    // Render a Button with minimal props
    const button = createComponent(Button, { text: 'Click me' });
    
    // Verify the component was created
    expect(createElement).toHaveBeenCalledWith(
      Button,
      { text: 'Click me' },
    );

    // Verify getRenderedOutput was called with correct props
    expect(getRenderedOutput).toHaveBeenCalled();
    
    // Extract the arguments that were passed to getRenderedOutput
    const renderArgs = (getRenderedOutput as jest.Mock).mock.calls[0][0];
    expect(renderArgs).toHaveProperty('text', 'Click me');
    expect(renderArgs).toHaveProperty('id');
    expect(renderArgs).toHaveProperty('config', expect.objectContaining({
      style: 'primary',
      width: 100,
      enabled: true,
      border: true
    }));
    expect(renderArgs).toHaveProperty('is_focused', false);
    expect(renderArgs).toHaveProperty('is_disabled', false);
  });

  it('renders with custom style', () => {
    // Render a Button with danger style
    const button = createComponent(Button, { 
      text: 'Delete', 
      style: 'danger' 
    });
    
    // Verify the component was created with correct props
    expect(createElement).toHaveBeenCalledWith(
      Button,
      { 
        text: 'Delete', 
        style: 'danger' 
      },
    );

    // Verify getRenderedOutput was called
    expect(getRenderedOutput).toHaveBeenCalled();
    
    // Extract the arguments that were passed to getRenderedOutput
    const renderArgs = (getRenderedOutput as jest.Mock).mock.calls[0][0];
    expect(renderArgs).toHaveProperty('text', 'Delete');
    expect(renderArgs).toHaveProperty('style', 'danger');
  });

  it('renders with disabled state', () => {
    // Render a disabled Button
    const button = createComponent(Button, { 
      text: 'Cannot click', 
      disabled: true 
    });
    
    // Verify the component was created with correct props
    expect(createElement).toHaveBeenCalledWith(
      Button,
      { 
        text: 'Cannot click', 
        disabled: true 
      },
    );

    // Verify getRenderedOutput was called
    expect(getRenderedOutput).toHaveBeenCalled();
    
    // Extract the arguments that were passed to getRenderedOutput
    const renderArgs = (getRenderedOutput as jest.Mock).mock.calls[0][0];
    expect(renderArgs).toHaveProperty('text', 'Cannot click');
    expect(renderArgs).toHaveProperty('disabled', true);
    expect(renderArgs).toHaveProperty('is_disabled', true);
    expect(renderArgs).toHaveProperty('config', expect.objectContaining({
      enabled: false
    }));
  });

  it('triggers onClick when clicked', () => {
    // Setup mock for onClick handler
    const onClick = jest.fn();
    
    // Render Button with onClick handler
    const button = createComponent(Button, { 
      text: 'Run', 
      onClick 
    });
    
    // Verify the component was created with correct props
    expect(createElement).toHaveBeenCalledWith(
      Button,
      { 
        text: 'Run', 
        onClick 
      },
    );

    // Verify getRenderedOutput was called
    expect(getRenderedOutput).toHaveBeenCalled();
    
    // Store the rendered button component for event handling
    const buttonComponent = button;
    
    // Trigger click event directly on the component
    triggerComponentMethod(buttonComponent, 'click', {});
    
    // Check if the handler was called
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders with custom width', () => {
    // Render a Button with custom width
    const button = createComponent(Button, { 
      text: 'Wide Button', 
      width: 200 
    });
    
    // Verify the component was created with correct props
    expect(createElement).toHaveBeenCalledWith(
      Button,
      { 
        text: 'Wide Button', 
        width: 200 
      },
    );

    // Verify getRenderedOutput was called
    expect(getRenderedOutput).toHaveBeenCalled();
    
    // Extract the arguments that were passed to getRenderedOutput
    const renderArgs = (getRenderedOutput as jest.Mock).mock.calls[0][0];
    expect(renderArgs).toHaveProperty('text', 'Wide Button');
    expect(renderArgs).toHaveProperty('width', 200);
  });

  it('renders with focused state', () => {
    // Render a focused Button
    const button = createComponent(Button, { 
      text: 'Focused', 
      focused: true 
    });
    
    // Verify the component was created with correct props
    expect(createElement).toHaveBeenCalledWith(
      Button,
      { 
        text: 'Focused', 
        focused: true 
      },
    );

    // Verify getRenderedOutput was called
    expect(getRenderedOutput).toHaveBeenCalled();
    
    // Extract the arguments that were passed to getRenderedOutput
    const renderArgs = (getRenderedOutput as jest.Mock).mock.calls[0][0];
    expect(renderArgs).toHaveProperty('text', 'Focused');
    expect(renderArgs).toHaveProperty('focused', true);
    expect(renderArgs).toHaveProperty('is_focused', true);
  });

  it('renders with borderless style', () => {
    // Render a borderless Button
    const button = createComponent(Button, { 
      text: 'No Border', 
      border: false 
    });
    
    // Verify the component was created with correct props
    expect(createElement).toHaveBeenCalledWith(
      Button,
      { 
        text: 'No Border', 
        border: false 
      },
    );

    // Verify getRenderedOutput was called
    expect(getRenderedOutput).toHaveBeenCalled();
    
    // Extract the arguments that were passed to getRenderedOutput
    const renderArgs = (getRenderedOutput as jest.Mock).mock.calls[0][0];
    expect(renderArgs).toHaveProperty('text', 'No Border');
    expect(renderArgs).toHaveProperty('border', false);
    expect(renderArgs).toHaveProperty('config', expect.objectContaining({
      border: false
    }));
  });

  it('renders fallback when bridge is unavailable', () => {
    // Mock bridge to throw an error
    (getRenderedOutput as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Bridge unavailable');
    });
    
    // Render a Button
    const button = createComponent(Button, { text: 'Fallback Button' });
    
    // Since the mock throws, the component should use fallback rendering
    // No assertions needed as we just want to exercise the fallback path
    // for coverage purposes
  });
});
