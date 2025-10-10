# Email Campaign Center - Frontend

Minimal, extensible React + TypeScript frontend for setting up email campaign configurations.

## Features

### Core Functionality
- **Campaign Setup** through a form with different recipient modes
- **Dynamic Fields** that appear based on selected options
- **Frontend Validation** with mutual exclusion checks for recipient modes
- **API Integration** with POST /emails/setup endpoint
- **Responsive Design** with vertical field stacking

### Recipient Modes
1. **Email List** - textarea for entering email addresses (one per line or separated by commas/semicolons)
2. **Database Filters** - country dropdown with flags and object type selection

### Required Generation Prompts
- Subject line prompt
- Email body prompt

### Conditional Features
- **Response Parsing** - parsing prompt field appears when enabled
- **Auto Responses** - auto response prompt field appears when enabled

### Style Settings (Optional)
- Tone of Voice (TOV): casual, friendly, professional, enthusiastic, sincere, playful
- Writing Style: short, storytelling, question_centric, compliment_first, conversational, structured
- Language (default: "pl")

### Sending Settings
- Corporate domain (checkbox)
- Daily limit (optional)
- Timezone (optional)

## Architecture

### Components
- `AppLayout` - basic layout with header and navigation
- `FormField` - base form field component
- `TextareaField` - multiline text field
- `SelectField` - select dropdown with options
- `ToggleField` - checkbox with label
- `CountrySelect` - country dropdown with flags
- `ObjectTypeSelect` - object type dropdown

### Pages
- `EmailsSetupPage` - main campaign setup page

### Routes
- `/` - home page
- `/emails/setup` - campaign setup

## Technical Details

### Dependencies
- React 18.2.0
- TypeScript 4.9.0
- React Router DOM 6.8.0
- React Hook Form 7.43.0

### API Integration
- **Method**: POST
- **Endpoint**: `/emails/setup`
- **Content-Type**: `application/json`
- **Request Format**: `CampaignSetupRequest`
- **Response Format**: `CampaignSetupResponse`

### Validation
- Mutual exclusion of recipient modes
- Required generation prompts
- Conditional required fields for parsing and auto-answering
- Error display next to relevant fields

## Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

The project will be available at `http://localhost:3000`

## Extension

The project is built for easy extension:
- Modular component architecture
- Separation into pages and components
- TypeScript for type safety
- React Hook Form for form management
- Prepared styles for additional components
