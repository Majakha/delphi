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

### Advanced Features
- **JSON Export/Import**: Save and load protocols as JSON files
- **Protocol Types**: Support for "In-lab" and "Real-world" protocols
- **Advanced Fields Toggle**: Show/hide advanced configuration options
- **Mobile-Friendly**: Responsive design that works on mobile devices
- **Auto-Save**: Automatic local storage of protocol data

### Sensor Management
- **Predefined Sensors**: Comprehensive list of common sensors (IMU, EEG, ECG, GPS, etc.)
- **Custom Sensors**: Add user-defined sensors with custom names
- **Categorized**: Sensors organized by category (Motion, Brain, Cardiac, etc.)
- **Multi-Select**: Select multiple sensors per section

## 🚀 Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd delphi-protocol-builder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000` to view the application.

### Building for Production

```bash
npm run build
```

This creates a `build` folder with optimized production files.

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── ProtocolEditor.tsx    # Main protocol editor
│   ├── SectionCard.tsx       # Individual section component
│   ├── SubsectionCard.tsx    # Subsection component
│   ├── SensorSelector.tsx    # Sensor selection component
│   └── RatingStars.tsx       # Rating stars component
├── types/               # TypeScript interfaces
│   └── index.ts
├── data/                # Static data
│   └── sensors.ts       # Predefined sensor list
├── App.tsx              # Main application component
├── index.tsx            # Application entry point
└── index.css            # Global styles and Tailwind imports
```

## 🎨 Component Architecture

### ProtocolEditor
The main component that manages the entire protocol state and provides:
- Protocol metadata editing (name, type)
- Section management (add, delete, reorder)
- Import/export functionality
- JSON preview

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

### Exporting Protocols
1. Click the "Export" button in the header
2. Protocol will be downloaded as a JSON file
3. File name includes the protocol name and timestamp

## 🔄 Drag-and-Drop

The application uses `react-beautiful-dnd` for smooth drag-and-drop functionality:
- Drag sections to reorder them
- Drag subsections within their parent section
- Visual feedback during dragging
- Automatic reordering and state updates

## 🎨 Styling

The application uses a modern, clean design with:
- Tailwind CSS for utility-first styling
- Responsive design for mobile compatibility
- Consistent color scheme and spacing
- Smooth animations and transitions
- Accessible design patterns

## 🚀 Future Enhancements

- **Protocol Templates**: Pre-built protocol templates
- **Collaboration**: Multi-user editing capabilities
- **Version Control**: Protocol versioning and history
- **Advanced Analytics**: Protocol analysis and insights
- **Integration**: API integration with external systems
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