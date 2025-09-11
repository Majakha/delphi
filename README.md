# Delphi Protocol Builder

A comprehensive web application for researchers designing data-gathering protocols for dementia studies. This tool supports creating structured test protocols for in-lab sessions with drag-and-drop functionality, sensor selection, and JSON export capabilities.

## 🎯 Features

### Core Functionality
- **Protocol Sections**: Create and manage multiple sections (sensor calibration, clinical tests, cognitive assessments, breaks)
- **Subsections**: Add optional subtasks within each section
- **Drag-and-Drop**: Reorder sections and subsections with intuitive drag-and-drop interface
- **Rating System**: Rate importance of sections and subsections (0-5 scale)
- **Sensor Selection**: Choose from predefined sensors or add custom ones
- **Notes**: Add comments and suggestions for each section/subsection
- **Break Management**: Special section type for labeled breaks
- **Drag-and-Drop Overview**: Visual overview panel with drag-and-drop reordering

### Authentication & Backend Integration
- **Password Authentication**: Secure login system with MySQL backend
- **Cloud Sync**: Upload protocols to server with automatic backup
- **Protocol Management**: Load previously uploaded protocols from server
- **Session Management**: Persistent login sessions with logout functionality
- **Auto-Save**: Automatic local storage with cloud synchronization
- **Click-to-Navigate**: Click sections in overview to scroll to them in editor

### Advanced Features
- **JSON Export/Import**: Save and load protocols as JSON files
- **Protocol Types**: Support for "In-lab" and "Real-world" protocols
- **Advanced Fields Toggle**: Show/hide advanced configuration options
- **Mobile-Friendly**: Responsive design that works on mobile devices
- **Sync Status**: Visual indicators for local vs. cloud synchronization
- **Two-Pane Layout**: Overview panel and detailed editor with seamless interaction

### Sensor Management
- **Predefined Sensors**: Comprehensive list of common sensors (IMU, EEG, ECG, GPS, etc.)
- **Custom Sensors**: Add user-defined sensors with custom names
- **Categorized**: Sensors organized by category (Motion, Brain, Cardiac, etc.)
- **Multi-Select**: Select multiple sensors per section

## 🚀 Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager
- MySQL database (for backend functionality)
- Docker and Docker Compose (optional, for containerized setup)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd delphi-protocol-builder
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd api
   npm install
   cd ..
   ```

4. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start with Docker (recommended)**
   ```bash
   docker-compose up
   ```

   **Or start manually:**
   ```bash
   # Start backend (in one terminal)
   cd api
   npm start

   # Start frontend (in another terminal)
   npm start
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000` to view the application.

### Building for Production

```bash
npm run build
```

This creates a `build` folder with optimized production files.

## 📁 Project Structure

```
delphi/
├── src/
│   ├── components/           # React components
│   │   ├── ProtocolEditor.tsx    # Main protocol editor
│   │   ├── SectionCard.tsx       # Individual section component
│   │   ├── SubsectionCard.tsx    # Subsection component
│   │   ├── SensorSelector.tsx    # Sensor selection component
│   │   ├── RatingStars.tsx       # Rating stars component
│   │   ├── Login.tsx             # Authentication component
│   │   ├── Header.tsx            # Header with logout
│   │   ├── UploadSync.tsx        # Cloud sync component
│   │   └── SectionsOverview.tsx  # Drag-and-drop overview panel
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx      # Authentication context
│   ├── services/            # API and data services
│   │   ├── api.ts               # Backend API client
│   │   └── protocolService.ts   # Protocol data management
│   ├── types/               # TypeScript interfaces
│   │   └── index.ts
│   ├── data/                # Static data
│   │   └── sensors.ts       # Predefined sensor list
│   ├── App.tsx              # Main application component
│   ├── index.tsx            # Application entry point
│   └── index.css            # Global styles and Tailwind imports
├── api/                     # Backend Node.js server
│   ├── server.js            # Express server with MySQL
│   ├── package.json         # Backend dependencies
│   └── Dockerfile           # Backend container config
├── db-init/                 # Database initialization
├── docker-compose.yml       # Full stack setup
└── .env.example            # Environment configuration template
```

## 🎨 Component Architecture

### ProtocolEditor
The main component that manages the entire protocol state and provides:
- Protocol metadata editing (name, type)
- Section management (add, delete, reorder)
- Import/export functionality
- JSON preview
- Two-pane layout coordination
- Drag-and-drop integration

### SectionCard
Individual section component with:
- Expandable/collapsible interface
- Basic fields (title, time, rating, type)
- Advanced fields (sensors, notes)
- Subsection management
- Drag-and-drop support

### SubsectionCard
Subsection component with:
- Title, time, and notes editing
- Drag-and-drop reordering
- Delete functionality

### SensorSelector
Sensor selection component with:
- Categorized sensor list
- Multi-select functionality
- Custom sensor addition
- Visual sensor tags

### RatingStars
Interactive rating component with:
- 5-star rating system
- Visual feedback
- Readonly mode support

### SectionsOverview
Overview panel component with:
- Visual section/subsection hierarchy
- Enable/disable toggles for all items
- Drag-and-drop reordering (sections and subsections)
- Cross-section subsection movement
- Click-to-scroll navigation
- Real-time statistics and progress tracking

## 🔧 Configuration

### Tailwind CSS
The application uses Tailwind CSS for styling. Configuration can be found in:
- `tailwind.config.js` - Tailwind configuration
- `postcss.config.js` - PostCSS configuration
- `src/index.css` - Global styles and component classes

### TypeScript
TypeScript is configured for type safety. Key interfaces:
- `Protocol` - Main protocol structure
- `Section` - Section data structure
- `Subsection` - Subsection data structure
- `Sensor` - Sensor data structure

## 📊 Data Structure

### Protocol
```typescript
interface Protocol {
  id: string;
  name: string;
  type: 'in-lab' | 'real-world';
  sections: Section[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Section
```typescript
interface Section {
  id: string;
  title: string;
  time: number;
  rating: number;
  note: string;
  sensors: string[];
  subsections: Subsection[];
  type: 'section' | 'break';
}
```

### Subsection
```typescript
interface Subsection {
  id: string;
  title: string;
  time: number;
  note: string;
}
```

## 🎯 Usage Examples

### Creating a New Protocol
1. Open the application
2. Enter a protocol name
3. Select protocol type (In-lab or Real-world)
4. Click "Add Section" to create your first section
5. Fill in section details (title, time, rating)
6. Add subsections if needed
7. Select sensors for the section
8. Add notes and comments
9. Use the overview panel to enable/disable sections and reorder items

### Adding Sensors
1. Expand a section's advanced fields
2. Click "Select Sensors"
3. Choose from predefined sensors by category
4. Add custom sensors using "Add Custom Sensor"
5. Remove sensors by clicking the X on sensor tags

### Managing Breaks
1. Click "Add Break" to create a break section
2. Breaks are automatically marked with a blue left border
3. Set break duration and add notes if needed

### Using Drag-and-Drop in Overview
1. **Section Reordering**: Drag sections by their grip handle to reorder
2. **Subsection Reordering**: Drag subsections within or between sections
3. **Cross-Section Movement**: Move subsections from one section to another
4. **Visual Feedback**: Drop zones highlight when dragging items
5. **Click Navigation**: Click section/subsection titles to scroll to them
6. **Enable/Disable**: Toggle sections and subsections on/off independently

### Exporting Protocols
1. Click the "Export" button in the header
2. Protocol will be downloaded as a JSON file
3. File name includes the protocol name and timestamp

## 🔄 Drag-and-Drop

The application uses `react-beautiful-dnd` for smooth drag-and-drop functionality:

### Main Editor
- Drag sections to reorder them
- Drag subsections within their parent section
- Visual feedback during dragging
- Automatic reordering and state updates

### Overview Panel
- **Section Reordering**: Drag sections to new positions
- **Subsection Management**: Drag subsections within or between sections
- **Cross-Section Movement**: Move subsections to different parent sections
- **Visual Drop Zones**: Highlighted areas show valid drop targets
- **Disabled State Handling**: Prevents dragging when items are disabled
- **Real-time Updates**: Changes immediately reflect in both panes

## 🎨 Styling

The application uses a modern, clean design with:
- Tailwind CSS for utility-first styling
- Responsive design for mobile compatibility
- Consistent color scheme and spacing
- Smooth animations and transitions
- Accessible design patterns

## 🔐 Authentication & Data Management

### Login System
1. Enter your password on the login screen
2. Passwords are validated against the MySQL database
3. Successful login provides access to protocol builder
4. Session is maintained until logout or browser close

### Cloud Synchronization
1. **Auto-save**: Protocols are automatically saved locally as you work
2. **Upload**: Click the "Upload" button to sync with the server
3. **Load**: Access previously uploaded protocols via the "Load" button
4. **Sync Status**: Visual indicators show synchronization state:
   - Green: Up to date
   - Blue: Saved locally
   - Orange: Needs upload

### Data Storage
- **Local**: Protocols saved in browser localStorage for offline access
- **Cloud**: Uploaded protocols stored in MySQL database
- **Backup**: Both local and cloud storage ensure data safety

### Development Debugging
In development mode, access debug utilities in the browser console:
```javascript
// Clear all local data
window.delphiDebug.clearAll();

// Clear authentication
window.delphiDebug.clearAuth();

// Show localStorage contents
window.delphiDebug.showStorage();
```

## 🎛️ Two-Pane Interface

### Overview Panel (Left)
- **Visual Hierarchy**: See all sections and subsections at a glance
- **Quick Enable/Disable**: Toggle items on/off with checkboxes
- **Drag-and-Drop**: Reorder sections and move subsections between sections
- **Navigation**: Click to scroll to items in the detailed editor
- **Statistics**: Real-time count of enabled items and total time
- **Active Highlighting**: Currently visible section is highlighted

### Editor Panel (Right)
- **Detailed Editing**: Full protocol editing capabilities
- **Section Management**: Add, edit, and configure sections
- **Subsection Details**: Manage subsection properties
- **Sensor Selection**: Choose and configure sensors
- **Advanced Options**: Access detailed configuration options
- **Drag-and-Drop**: Traditional section/subsection reordering

## 🔧 Backend Configuration

### Environment Variables
Create a `.env` file with the following configuration:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3001

# Development Settings
REACT_APP_ENVIRONMENT=development
REACT_APP_DEBUG=false

# Backend Database (for docker-compose)
DB_HOST=mysql
DB_USER=root
DB_PASSWORD=example
DB_NAME=mydatabase
```

### Database Setup
The application uses MySQL for user authentication and protocol storage:
- **access_passwords**: Stores user authentication data
- **protocols**: Stores uploaded protocol data with user association

### API Endpoints
- `POST /api/check-password`: Validate user password
- `POST /api/upload`: Upload protocol data to server
- `POST /api/uploads`: Retrieve user's uploaded protocols

## 🚀 Future Enhancements

- **JWT Tokens**: Replace password-based auth with secure tokens
- **User Management**: User registration and profile management
- **Protocol Templates**: Pre-built protocol templates
- **Collaboration**: Multi-user editing capabilities
- **Version Control**: Protocol versioning and history
- **Advanced Analytics**: Protocol analysis and insights
- **Rate Limiting**: API protection against abuse
- **Offline Support**: PWA capabilities for offline use

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Delphi Protocol Builder** - Empowering researchers to design comprehensive data-gathering protocols for dementia studies. 