# StudioWizard - Architecture & Design Diagrams

## Component Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         StudioWizard                                 │
│                        (Main Component)                              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐      ┌──────────────┐      ┌──────────────┐
│  Step 0       │      │   Step 1     │      │   Step 2     │
│ (Type Select) │      │  (Basic Info)│      │ (Podcast     │
│               │      │              │      │  Config)     │
│ • Podcast     │      │ • Title      │      │              │
│ • Video       │      │ • Description│      │ • Guest Type │
│ • Article     │      │ • Theme      │      │ • Guest Name │
└───────────────┘      └──────────────┘      │ • Date/Time  │
                                              │ • Location   │
                                              │ • Season     │
                                              └──────────────┘
                               │
                    ┌──────────────────────┐
                    │ Form Data Management │
                    │ (useState)           │
                    │ • projectType        │
                    │ • title              │
                    │ • description        │
                    │ • theme              │
                    │ • guestType          │
                    │ • guestName          │
                    │ • scheduledDate      │
                    │ • scheduledTime      │
                    │ • location           │
                    │ • season             │
                    └──────────────────────┘
```

## State Flow Diagram

```
                    ┌────────────────┐
                    │   Initial      │
                    │   (step = 0)   │
                    └────────────────┘
                           │
                    (Project Type Selected)
                           │
                           ▼
                    ┌────────────────┐
                    │   Step 1       │
                    │   (step = 1)   │
                    │  Title, etc.   │
                    └────────────────┘
                           │
                  (Title Entered, Next)
                           │
                           ▼
                    ┌────────────────┐
                    │   Step 2       │
                    │   (step = 2)   │
                    │  Guest Config  │
                    └────────────────┘
                           │
            ┌──────────────┬┴──────────────┐
            │              │               │
        (Back)      (Create)      (Error)
            │              │               │
            ▼              ▼               ▼
      (Step 1)   (Supabase)      (Error Message)
                      │                   │
                      ▼                   │
              (Episode Created)           │
                      │                   │
                      ▼                   │
              (onComplete Called)         │
                      │                   │
                      └───────────┬───────┘
                                  │
                        (Cancel or Success)
                                  │
                                  ▼
                          (Wizard Closes)
```

## Data Flow Diagram

```
┌─────────────────┐
│  User Input     │
│  (UI Interaction)
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│  Form Data State Update  │
│  setFormData(...)        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Validation              │
│  • Required checks       │
│  • Error state           │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  User Action             │
│  • Next / Back / Create  │
└────────┬─────────────────┘
         │
         ├─────────────┬─────────────┐
         │             │             │
    (Next/Back)   (Create)    (Cancel)
         │             │             │
         ▼             ▼             ▼
  (Step Update)   (Async)    (Confirmation)
                      │             │
                      ▼             ▼
              ┌──────────────┐  ┌──────────────┐
              │ Supabase     │  │ Dialog       │
              │ INSERT       │  │ Show Cancel  │
              └────┬─────────┘  └──────┬───────┘
                   │                   │
                   ▼                   ▼
         ┌──────────────────┐  ┌──────────────────┐
         │ Episode Created  │  │ User Confirms    │
         │ or Error         │  │ Cancel           │
         └────┬─────────────┘  └──────┬───────────┘
              │                        │
              ▼                        ▼
       ┌─────────────────┐   ┌─────────────────┐
       │ onComplete(...)│   │ onCancel()      │
       │ with Project   │   │                 │
       └─────────────────┘   └─────────────────┘
```

## Component Interaction Diagram

```
Parent Component
      │
      │ Passes Props
      ├─ showId
      ├─ userId
      ├─ onComplete
      └─ onCancel
           │
           ▼
    ┌──────────────────┐
    │  StudioWizard    │
    └──────────────────┘
           │
     ┌─────┼─────┐
     │     │     │
     ▼     ▼     ▼
  ┌──────────────────────┐
  │  Modal UI            │
  │ • Progress Bar       │
  │ • Step Indicators    │
  │ • Form Inputs        │
  │ • Error Messages     │
  │ • Navigation Buttons │
  └──────────────────────┘
           │
           ▼
  ┌──────────────────────┐
  │  State Management    │
  │ • step (0|1|2)      │
  │ • formData          │
  │ • isCreatingProject │
  │ • error             │
  └──────────────────────┘
           │
           ▼
  ┌──────────────────────┐
  │  Event Handlers      │
  │ • handleNext        │
  │ • handleBack        │
  │ • handleCreate      │
  │ • handleCancel      │
  └──────────────────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
 ┌────────┐  ┌──────────────┐
 │Supabase│  │Callback Fn   │
 │Client  │  │ • onComplete │
 └────────┘  │ • onCancel   │
             └──────────────┘
```

## Supabase Integration Diagram

```
StudioWizard Component
        │
        │ handleCreate()
        │
        ▼
┌────────────────────────────────────┐
│  Form Data Validation              │
│  • guestName required              │
│  • theme required                  │
└────────┬────────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│  Prepare Insert Data               │
│                                    │
│  {                                 │
│    show_id: showId,                │
│    user_id: userId,                │
│    title: formData.title,          │
│    description: formData.desc,     │
│    guest_name: formData.guestName, │
│    episode_theme: formData.theme,  │
│    status: 'draft',                │
│    location: formData.location,    │
│    season: formData.season,        │
│    created_at: ISO string,         │
│    updated_at: ISO string          │
│  }                                 │
└────────┬────────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│  Supabase Insert Operation         │
│                                    │
│  supabase                          │
│    .from('podcast_episodes')      │
│    .insert(data)                   │
│    .select()                       │
│    .single()                       │
└────────┬────────────────────────────┘
         │
     ┌───┴───┐
     │       │
    ✓       ✗
     │       │
     ▼       ▼
 Success  Error
     │       │
     ▼       ▼
┌────────┐ ┌────────────────┐
│Episode │ │Error Message   │
│ Data   │ │setError(...)   │
└───┬────┘ └────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  Convert to StudioProject   │
│                             │
│  {                          │
│    id: episode.id,         │
│    type: 'podcast',        │
│    title: episode.title,   │
│    showId: showId,         │
│    status: 'draft',        │
│    createdAt: now(),       │
│    updatedAt: now(),       │
│    metadata: { ... }       │
│  }                          │
└────────┬────────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Call onComplete(project)  │
│                            │
│  Parent handles:           │
│  • Navigate to workspace   │
│  • Update project list     │
│  • Set active project      │
└────────────────────────────┘
```

## Validation Logic Diagram

```
User Interaction
      │
      ▼
Step 1: Title Input
   │
   ├─ Empty? ────────────────────┐
   │                             │
   │ Filled?                     ▼
   └──────► Validation: PASS   Error: "Título é
                  │           obrigatório"
                  │
                  ▼
            Enable "Próximo"
                  │
                  ├─ Click "Próximo"
                  │
                  ▼
           Step 2: Guest Config
                  │
                  ├─ Guest Name empty? ──────┐
                  │                          │
                  │ Filled?                  ▼
                  │                      Error: "Nome do
                  │                      convidado é
                  │                      obrigatório"
                  │
                  ├─ Theme empty? ───────────┐
                  │                          │
                  │ Filled?                  ▼
                  │                      Error: "Tema é
                  │                      obrigatório"
                  │
                  ├─ Both filled?
                  │
                  ▼
            Enable "Criar Episódio"
                  │
                  ├─ Click "Criar Episódio"
                  │
                  ▼
         Create Episode (Supabase)
                  │
              ┌───┴───┐
              │       │
            Success Error
              │       │
              ▼       ▼
        onComplete setError
                │       │
                │       ▼
                │   Show Error
                │   Message
                │       │
                ▼       ▼
          Wizard      Error
          Closes      Cleared on
          (Parent     Input
          Handles)    Change
```

## UI Layout Diagram

```
╔═════════════════════════════════════════════════════════════════╗
║                      STUDIO WIZARD MODAL                         ║
╠═════════════════════════════════════════════════════════════════╣
║                         Progress Bar                             ║
║ ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
╠═════════════════════════════════════════════════════════════════╣
║  Step Indicators:  ① ─── ② ─── ③                                ║
╠═════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  STEP 1: BASIC INFORMATION                                       ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────┐   ║
║  │ Título                                                  │   ║
║  │ ┌─────────────────────────────────────────────────────┐ │   ║
║  │ │ [Input Field]                                       │ │   ║
║  │ └─────────────────────────────────────────────────────┘ │   ║
║  └─────────────────────────────────────────────────────────┘   ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────┐   ║
║  │ Descrição (Opcional)                                   │   ║
║  │ ┌─────────────────────────────────────────────────────┐ │   ║
║  │ │ [Textarea]                                          │ │   ║
║  │ └─────────────────────────────────────────────────────┘ │   ║
║  └─────────────────────────────────────────────────────────┘   ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────┐   ║
║  │ Tema                                                    │   ║
║  │ ┌─────────────────────────────────────────────────────┐ │   ║
║  │ │ [Input Field]                                       │ │   ║
║  │ └─────────────────────────────────────────────────────┘ │   ║
║  └─────────────────────────────────────────────────────────┘   ║
║                                                                   ║
║  ┌──────────────────────┬──────────────────────────────────┐   ║
║  │    [Voltar]          │         [Próximo →]              │   ║
║  └──────────────────────┴──────────────────────────────────┘   ║
║                                                                   ║
╚═════════════════════════════════════════════════════════════════╝
```

## TypeScript Type Hierarchy

```
StudioWizardProps
├── showId: string
├── userId: string
├── onComplete: (project: StudioProject) => void
└── onCancel: () => void

WizardFormData
├── projectType: ProjectTypeOption ('podcast')
├── title: string
├── description: string
├── theme: string
├── guestType: GuestType ('individual'|'duo'|'trio'|'panel')
├── guestName: string
├── scheduledDate: string
├── scheduledTime: string
├── location: string
└── season: string

StudioProject
├── id: string
├── type: ProjectType ('podcast'|'video'|'article')
├── title: string
├── description?: string
├── showId?: string
├── status: 'draft'|'in_progress'|'completed'|'archived'
├── createdAt: Date
├── updatedAt: Date
└── metadata: ProjectMetadata
    ├── type: 'podcast'
    ├── guestName?: string
    ├── episodeTheme?: string
    ├── scheduledDate?: string
    ├── scheduledTime?: string
    ├── location?: string
    ├── season?: string
    └── recordingDuration?: number
```

## Component Lifecycle Diagram

```
                    Component Mounted
                           │
                           ▼
                    ┌──────────────┐
                    │ Initial State│
                    │ • step = 0   │
                    │ • formData   │
                    │ • error=null │
                    └──────┬───────┘
                           │
                           ▼
                    Render Step 0
            (Project Type Selection)
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   (Podcast)          (Video)           (Article)
        │                  │                  │
        ▼                  ▼                  ▼
   Enabled            Disabled           Disabled
        │              (greyed out)      (greyed out)
        │
   handleProjectTypeSelect('podcast')
        │
        ▼
   Step Updated → Render Step 1
        (Basic Information)
        │
   User Input + Validation
        │
        ▼
   handleNext() [if valid]
        │
        ▼
   Step Updated → Render Step 2
        (Podcast Configuration)
        │
   User Input + Validation
        │
        ├─ handleBack()  ──────────► Step Updated → Re-render Step 1
        │
        ├─ handleCreate() [if valid]
        │       │
        │       ├─ setIsCreatingProject(true)
        │       │
        │       ├─ Supabase INSERT
        │       │
        │       ├─ Convert to StudioProject
        │       │
        │       ├─ onComplete(project)
        │       │
        │       └─ Component Unmounts (parent handles)
        │
        └─ handleCancel()
                │
                ├─ hasEnteredData() check
                │
                ├─ Show Confirmation Dialog
                │
                └─ User Confirms
                        │
                        ├─ onCancel()
                        │
                        └─ Component Unmounts
```

## Error Handling Flow

```
User Action (Create)
      │
      ▼
Validation Checks
      │
      ├─ Invalid ──► setError(message)
      │                  │
      │                  ▼
      │           Render Error UI
      │           with Red Border
      │                  │
      │          User Corrects Input
      │                  │
      │          Error Cleared
      │
      └─ Valid ──► setIsCreatingProject(true)
                       │
                       ▼
                  Supabase Insert
                       │
             ┌─────────┴─────────┐
             │                   │
           Success            Error
             │                   │
             ▼                   ▼
      onComplete()       dbError Caught
             │                   │
             │            setError(message)
             │                   │
             │           setIsCreatingProject(false)
             │                   │
             │            Render Error UI
             │                   │
             │           Show Alert Icon
             │                   │
             │           Button Re-enabled
             │                   │
             └─────────┬─────────┘
                       │
                Component Unmounts or User Retries
```

---

These diagrams provide a comprehensive view of the StudioWizard component's:
- Architecture and component structure
- Data flow patterns
- State transitions
- User interactions
- Database operations
- Error handling
- UI layout
- Type relationships
- Lifecycle management

For implementation details, see the [STUDIO_WIZARD_USAGE.md](./src/modules/studio/views/STUDIO_WIZARD_USAGE.md) documentation.
