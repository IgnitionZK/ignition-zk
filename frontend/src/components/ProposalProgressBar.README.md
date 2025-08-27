# ProposalProgressBar Component

A React component that displays a horizontal progress bar for tracking proposal lifecycle stages. The component shows six distinct steps with visual indicators for current, completed, and rejected states.

## Features

- **Six-Step Progress**: Tracks the complete proposal lifecycle from submission to execution
- **Visual States**: Different colors and icons for completed, current, and rejected steps
- **Rejection Handling**: Supports three rejection scenarios with appropriate visual feedback
- **Phase Labels**: Shows "Proposal Voting Phase" and "Proposal Review Phase" above the progress line
- **Responsive Design**: Built with styled-components for consistent styling
- **Smooth Transitions**: CSS transitions for state changes

## Steps

1. **Submitted** - Initial proposal submission
2. **Accepted** - Proposal approved by voting
3. **Claimed** - Award claimed by member
4. **Transfer Requested** - Transfer request submitted
5. **Transfer Approved** - Transfer approved
6. **Transfer Executed** - Transfer completed

## Props

| Prop                      | Type      | Default | Description                                     |
| ------------------------- | --------- | ------- | ----------------------------------------------- |
| `currentStep`             | `number`  | `1`     | Current active step (1-6)                       |
| `isStep2Rejected`         | `boolean` | `false` | Whether step 2 (Accepted) was rejected          |
| `isStep3NotClaimed`       | `boolean` | `false` | Whether step 3 (Claimed) was not claimed        |
| `isStep5TransferRejected` | `boolean` | `false` | Whether step 5 (Transfer Approved) was rejected |

## Usage

### Basic Usage

```jsx
import ProposalProgressBar from "./components/ProposalProgressBar";

function ProposalPage() {
  return <ProposalProgressBar currentStep={3} />;
}
```

### With Rejection States

```jsx
function ProposalPage() {
  return <ProposalProgressBar currentStep={2} isStep2Rejected={true} />;
}
```

### Complete Example

```jsx
function ProposalPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isRejected, setIsRejected] = useState(false);

  return (
    <ProposalProgressBar
      currentStep={currentStep}
      isStep2Rejected={isRejected}
      isStep3NotClaimed={false}
      isStep5TransferRejected={false}
    />
  );
}
```

## Visual States

### Completed Steps

- **Color**: Green (#22c55e)
- **Icon**: White checkmark (✓)
- **Progress Line**: Green segments

### Current Step

- **Color**: Grey (#6b7280)
- **Icon**: White number
- **Size**: Larger circle (3.2rem vs 2.4rem)
- **Progress Line**: No color change

### Rejected Steps

- **Color**: Red (#ef4444)
- **Icon**: White X mark (✗)
- **Progress Line**: Red segments up to the rejected step
- **Label**: Changes to rejection message
- **Important**: Progress bar segments after a rejected step are not highlighted

### Pending Steps

- **Color**: Muted blue-grey
- **Icon**: White number
- **Progress Line**: No color change

## Rejection Scenarios

**Note**: When any step is rejected, the progress bar segments after that step will not be highlighted, indicating that the process has stopped at that point.

### 1. Step 2 Rejected

- **Trigger**: `isStep2Rejected={true}`
- **Visual**: Red circle with X, "Rejected" label
- **Progress**: Red line to step 2, no highlighting after

### 2. Step 3 Not Claimed

- **Trigger**: `isStep3NotClaimed={true}`
- **Visual**: Red circle with X, "Not Claimed" label
- **Progress**: Red line to step 3, no highlighting after

### 3. Step 5 Transfer Rejected

- **Trigger**: `isStep5TransferRejected={true}`
- **Visual**: Red circle with X, "Transfer Rejected" label
- **Progress**: Red line to step 5, no highlighting after

## Styling

The component uses styled-components and follows the existing design system:

- **Background**: Dark blue with transparency
- **Border Radius**: 0.8rem for container, 0.2rem for progress line
- **Colors**: Consistent with the existing color palette
- **Typography**: Matches existing font sizes and weights
- **Spacing**: Uses consistent spacing units (0.8rem, 1.6rem, etc.)

## Dependencies

- `react` - React library
- `styled-components` - CSS-in-JS styling
- `react-icons` - Icon library (FaCheck, FaTimes)

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- CSS custom properties (CSS variables) support required

## Accessibility

- Semantic HTML structure
- High contrast colors for state indicators
- Clear visual hierarchy
- Responsive design for different screen sizes
