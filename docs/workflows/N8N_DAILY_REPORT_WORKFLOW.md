# n8n Daily Report Generation Workflow

## Overview

This workflow automatically generates end-of-day summaries by:
1. Aggregating data from the day (tasks, memories, mood)
2. Analyzing patterns and trends
3. Calling Gemini AI for insights and recommendations
4. Storing the report in Supabase
5. Sending notifications to the user

**Trigger:** Cron job every day at 23:59 UTC

---

## Workflow Architecture

```
Cron Trigger (23:59 UTC)
         ↓
Get User & Date
         ↓
Fetch Today's Data
├─ Tasks completed
├─ Memories created
├─ Contacts interacted
└─ Work items metrics
         ↓
Aggregate Statistics
├─ Task completion rate
├─ Time spent
├─ Mood tracking
└─ Energy/stress levels
         ↓
Get Memories for Analysis
         ↓
Call Gemini API
├─ Sentiment analysis
├─ Pattern detection
├─ Insight generation
└─ Recommendation creation
         ↓
Calculate Productivity Score
         ↓
Insert Daily Report
         ↓
Trigger Notifications
         ↓
SUCCESS
```

---

## Workflow Steps

### 1. Cron Trigger

**Node Type:** Cron

**Configuration:**
```
Trigger Time: 23:59 UTC
Frequency: Every day
```

**Output:**
```json
{
  "timestamp": "2024-12-02T23:59:00Z",
  "trigger": "daily_report_generation"
}
```

---

### 2. Get Users to Process

**Node Type:** Supabase (Query Rows)

**Purpose:** Get all active users who should receive reports

**Query Configuration:**
- **Table:** `users`
- **Filter:** `is_active = true`
- **Select:** `id, email, name`

**Output:**
```json
{
  "data": [
    {"id": "user-123", "email": "user@example.com", "name": "João"},
    {"id": "user-456", "email": "user2@example.com", "name": "Maria"}
  ]
}
```

---

### 3. Loop Through Users

**Node Type:** Loop

**Configuration:**
- **Iterate over:** `data` array from previous step
- **Process each user individually**

---

### 4. Set Report Date

**Node Type:** Function

**Code:**
```javascript
const today = new Date();
const reportDate = today.toISOString().split('T')[0]; // YYYY-MM-DD

return {
  reportDate: reportDate,
  userId: $input.items[0].json.id,
  userName: $input.items[0].json.name,
  email: $input.items[0].json.email
};
```

---

### 5. Get Tasks Completed Today

**Node Type:** Supabase (Query Rows)

**Configuration:**
- **Table:** `work_items`
- **Filter:**
  - `user_id = {userId}`
  - `completed_at >= {today at 00:00}`
  - `completed_at <= {today at 23:59}`
- **Select:** `id, title, estimated_duration, completed_at, association_id`

**Output:** Array of completed tasks with metadata

---

### 6. Get All Tasks (for total count)

**Node Type:** Supabase (Query Rows)

**Configuration:**
- **Table:** `work_items`
- **Filter:**
  - `user_id = {userId}`
  - `created_at >= {today at 00:00}`
  - `created_at <= {today at 23:59}`
- **Select:** `id, state`

**Output:** Total tasks created/assigned today

---

### 7. Get Today's Memories

**Node Type:** Supabase (Query Rows)

**Configuration:**
- **Table:** `memories`
- **Filter:**
  - `user_id = {userId}`
  - `created_at >= {today at 00:00}`
  - `created_at <= {today at 23:59}`
- **Select:** `id, sentiment, summary, triggers, subjects, importance`
- **Order by:** `created_at DESC`
- **Limit:** 50

**Output:** Array of memories from today

---

### 8. Get Top Interactions

**Node Type:** Supabase (Query Rows)

**Configuration:**
- **Table:** `contact_network`
- **Filter:**
  - `user_id = {userId}`
  - `last_interaction_at >= {today at 00:00}`
- **Select:** `id, name, last_interaction_at`
- **Order by:** `last_interaction_at DESC`
- **Limit:** 10

**Output:** Top contacts interacted with today

---

### 9. Calculate Metrics

**Node Type:** Function

**Code:**
```javascript
const tasksCompleted = $input.items[0].json.tasks_completed || [];
const allTasks = $input.items[1].json.all_tasks || [];
const memories = $input.items[2].json.memories || [];
const contacts = $input.items[3].json.contacts || [];

// Task metrics
const tasksCompletedCount = tasksCompleted.length;
const tasksTotalCount = allTasks.length;
const completionRate = tasksTotalCount > 0 ? (tasksCompletedCount / tasksTotalCount) * 100 : 0;

// Time metrics
const totalTimeSpent = tasksCompleted.reduce((sum, task) => {
  return sum + (task.estimated_duration || 0);
}, 0);

// Memory metrics
const averageSentiment = memories.length > 0
  ? memories.reduce((sum, m) => sum + (m.sentiment_score || 0), 0) / memories.length
  : 0;

const topSubjects = [...new Set(memories.flatMap(m => m.subjects || []))].slice(0, 5);

// Productivity score (0-100)
let productivityScore = 50; // base
productivityScore += Math.min(30, (tasksCompletedCount / 10) * 30); // task completion
productivityScore += Math.min(20, (totalTimeSpent / 480) * 20); // time spent (8 hours = 480 min)
productivityScore += Math.min(20, memories.length * 2); // memory creation

return {
  tasksCompleted: tasksCompletedCount,
  tasksTotal: tasksTotalCount,
  completionRate: completionRate,
  totalTimeSpent: totalTimeSpent,
  averageSentiment: averageSentiment,
  topSubjects: topSubjects,
  productivityScore: Math.min(100, productivityScore),
  memoryCount: memories.length,
  contactCount: contacts.length
};
```

---

### 10. Get User's Recent Mood (if exists)

**Node Type:** Supabase (Query Rows)

**Configuration:**
- **Table:** `daily_reports` (if exists from previous day)
- **Filter:**
  - `user_id = {userId}`
  - `report_date = {yesterday}`
- **Select:** `mood, energy_level, stress_level`

**Note:** For first report, use defaults

---

### 11. Call Gemini for Insights

**Node Type:** HTTP Request

**Configuration:**
- **Method:** POST
- **URL:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={{env.GEMINI_API_KEY}}`

**Request Body:**
```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "Generate a daily report summary based on this data:\n\nDate: {{reportDate}}\nUser: {{userName}}\nTasks Completed: {{tasksCompleted}}/{{tasksTotal}}\nTime Spent: {{totalTimeSpent}} minutes\nAverage Sentiment: {{averageSentiment}} (range -1 to 1)\nTop Subjects: {{topSubjects}}\nMemories Created: {{memoryCount}}\nContacts Interacted: {{contactCount}}\nTop Contacts: {{topContacts}}\n\nGenerateJSON with this structure:\n{\n  \"summary\": \"2-3 sentence overview of the day\",\n  \"key_insights\": [\"insight1\", \"insight2\", \"insight3\"],\n  \"patterns_detected\": [\"pattern1\", \"pattern2\"],\n  \"ai_recommendations\": [\"recommendation1\", \"recommendation2\"],\n  \"suggested_focus_areas\": [\"area1\", \"area2\"]\n}\n\nBe encouraging and constructive. Focus on actionable insights."
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "topK": 40,
    "topP": 0.95,
    "maxOutputTokens": 800
  }
}
```

**Response Handling:**
```javascript
const response = $input.first().json;
const content = response.candidates[0].content.parts[0].text;

let insights;
try {
  insights = JSON.parse(content);
} catch (e) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  insights = jsonMatch ? JSON.parse(jsonMatch[0]) : {
    summary: "Check your day's activity",
    key_insights: [],
    patterns_detected: [],
    ai_recommendations: [],
    suggested_focus_areas: []
  };
}

return { insights };
```

---

### 12. Prepare Daily Report

**Node Type:** Function

**Code:**
```javascript
const reportDate = $input.items[0].json.reportDate;
const userId = $input.items[0].json.userId;
const metrics = $input.items[1].json.metrics;
const insights = $input.items[2].json.insights;
const topContacts = $input.items[3].json.contacts;

const report = {
  user_id: userId,
  report_date: reportDate,

  // Productivity metrics
  tasks_completed: metrics.tasksCompleted,
  tasks_total: metrics.tasksTotal,
  productivity_score: metrics.productivityScore,
  estimated_vs_actual: 1.0, // Placeholder - would need actual tracking

  // Emotional & mood data
  mood: null, // User would set via UI
  mood_score: metrics.averageSentiment,
  energy_level: null, // User would set via UI
  stress_level: null, // User would set via UI

  // Activity summary
  active_modules: metrics.topSubjects,
  top_interactions: topContacts.map(c => c.name),
  significant_events: [],

  // Generated insights
  summary: insights.summary,
  key_insights: insights.key_insights,
  patterns_detected: insights.patterns_detected,
  ai_recommendations: insights.ai_recommendations,
  suggested_focus_areas: insights.suggested_focus_areas,

  // Memories created
  memory_ids: [],

  // Context
  notes: null,
  location: null,
  weather_notes: null,

  // Privacy
  is_shared_with_associations: [],

  // Timestamps
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

return { report };
```

---

### 13. Insert Daily Report

**Node Type:** Supabase (Insert Rows)

**Configuration:**
- **Table:** `daily_reports`
- **Rows:**
```json
[
  {
    "user_id": "{{userId}}",
    "report_date": "{{reportDate}}",
    "tasks_completed": "{{report.tasks_completed}}",
    "tasks_total": "{{report.tasks_total}}",
    "productivity_score": "{{report.productivity_score}}",
    "mood_score": "{{report.mood_score}}",
    "active_modules": "{{report.active_modules}}",
    "top_interactions": "{{report.top_interactions}}",
    "summary": "{{report.summary}}",
    "key_insights": "{{report.key_insights}}",
    "patterns_detected": "{{report.patterns_detected}}",
    "ai_recommendations": "{{report.ai_recommendations}}",
    "suggested_focus_areas": "{{report.suggested_focus_areas}}",
    "is_shared_with_associations": "{{report.is_shared_with_associations}}"
  }
]
```

**Output:** Created report with ID

---

### 14. Check for Significant Patterns

**Node Type:** Function

**Code:**
```javascript
const report = $input.items[0].json.data[0];
const patterns = report.patterns_detected || [];
const recommendations = report.ai_recommendations || [];

const alerts = [];

// Check for concerning patterns
if (patterns.includes('procrastination') || patterns.includes('low_productivity')) {
  alerts.push({
    type: 'productivity_concern',
    message: 'You seem to be struggling with productivity today'
  });
}

if (report.mood_score < -0.3) {
  alerts.push({
    type: 'mood_concern',
    message: 'Your sentiment has been negative - consider self-care'
  });
}

// High productivity alert
if (report.productivity_score > 85) {
  alerts.push({
    type: 'achievement',
    message: 'Great day! You exceeded your productivity goals'
  });
}

return { alerts };
```

---

### 15. Trigger Notifications

**Node Type:** HTTP Request (to your Node.js backend)

**Configuration:**
- **Method:** POST
- **URL:** `{{env.APP_BASE_URL}}/api/notifications`

**Request Body:**
```json
{
  "userId": "{{userId}}",
  "email": "{{email}}",
  "reportType": "daily_report",
  "reportDate": "{{reportDate}}",
  "title": "Your Daily Summary is Ready",
  "message": "Check your insights and recommendations for {{reportDate}}",
  "alerts": "{{alerts}}",
  "actionUrl": "/daily-summary?date={{reportDate}}"
}
```

---

### 16. Send Email Notification (Optional)

**Node Type:** Gmail / Email

**Configuration:**
- **To:** `{{email}}`
- **Subject:** `Daily Summary - {{reportDate}}`
- **Body:** HTML template with key metrics and highlights

**Template:**
```html
<h2>Your Daily Summary</h2>
<p>Hi {{userName}},</p>

<h3>Productivity Score: {{productivityScore}}/100</h3>
<p>Tasks Completed: {{tasksCompleted}}/{{tasksTotal}}</p>

<h3>Key Insights</h3>
<ul>
  {{#each keyInsights}}
  <li>{{this}}</li>
  {{/each}}
</ul>

<h3>Tomorrow's Focus</h3>
<ul>
  {{#each suggestedFocusAreas}}
  <li>{{this}}</li>
  {{/each}}
</ul>

<p><a href="{{actionUrl}}">View Full Report</a></p>
```

---

### 17. Log Workflow Execution

**Node Type:** Function

**Code:**
```javascript
console.log(`✅ Daily report generated for user ${userId}
  Date: ${reportDate}
  Tasks: ${tasksCompleted}/${tasksTotal}
  Productivity: ${productivityScore}%
  Insights: ${keyInsights.length}
  Timestamp: ${new Date().toISOString()}
`);

return {
  success: true,
  userId: userId,
  reportDate: reportDate,
  timestamp: new Date().toISOString()
};
```

---

### 18. Error Handler

**Node Type:** Error Handler

**Configuration:**
- **Catch errors from all nodes**
- **Log errors to console and database**

**Error Logging:**
```javascript
const error = $error.message;
const userId = $input.items[0].json.userId;

console.error(`❌ Daily report generation failed for user ${userId}
  Error: ${error}
  Timestamp: ${new Date().toISOString()}
`);

// Optional: Insert error log to database
// This allows tracking failures for retry logic
```

---

## Configuration

### Environment Variables

```bash
# Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
APP_BASE_URL=https://your-app-domain.com

# Email (Optional)
GMAIL_EMAIL=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Timezone (for Cron)
TZ=America/Sao_Paulo
```

---

## Testing the Workflow

### Manual Test (Without Cron)

1. Remove the Cron trigger temporarily
2. Add a Manual trigger node
3. Set up test data with a sample user ID
4. Execute the workflow
5. Check Supabase for the created report
6. Verify notifications were sent

### Test Data

```json
{
  "userId": "test-user-123",
  "email": "test@example.com",
  "userName": "Test User",
  "reportDate": "2024-12-02"
}
```

### Expected Outputs

- ✅ Report inserted in `daily_reports` table
- ✅ Notification sent to user
- ✅ Email notification (if configured)
- ✅ Workflow execution log
- ✅ No errors in console

---

## Performance Optimization

### Database Queries
- Use indexes on `user_id`, `created_at` for fast filtering
- Limit queries to 50-100 records
- Use SELECT to only fetch needed columns

### API Calls
- Cache Gemini results if running multiple times
- Implement retry logic for failed API calls
- Set timeouts on all external requests

### Scalability
- Run workflow sequentially for each user (not in parallel initially)
- Add database connection pooling
- Consider splitting into sub-workflows for large user bases

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Execution Time:** How long the workflow takes
2. **Success Rate:** Percentage of successful reports
3. **Error Rate:** Failed report generations
4. **Data Quality:** Are insights making sense?

### Logging

All execution logs should be stored in a dedicated table:
```sql
CREATE TABLE workflow_logs (
  id UUID PRIMARY KEY,
  workflow_name VARCHAR,
  user_id UUID,
  status VARCHAR (success/error),
  duration_ms INT,
  error_message TEXT,
  created_at TIMESTAMP
);
```

---

## Troubleshooting

### Issue: "Supabase query timeout"
**Solution:**
- Check indexes on `created_at` columns
- Reduce date range for queries
- Increase query timeout setting

### Issue: "Gemini API rate limit exceeded"
**Solution:**
- Implement exponential backoff retry
- Queue requests if necessary
- Consider batch processing

### Issue: "Report not appearing in UI"
**Solution:**
- Verify user_id matches authenticated user
- Check report_date format (YYYY-MM-DD)
- Verify RLS policies allow read access

### Issue: "Notifications not sent"
**Solution:**
- Check if notification service is running
- Verify email/notification credentials
- Review workflow error logs

---

## Future Enhancements

1. **Mood & Energy Pre-fill**
   - Fetch mood from user's last input
   - Auto-estimate energy based on task completion rate

2. **Comparison Reports**
   - Compare today vs yesterday
   - Weekly/monthly summaries
   - Trend analysis

3. **Personalized Insights**
   - Based on user's history
   - Contextual recommendations
   - Time-of-day analysis

4. **Mobile Notifications**
   - Push notifications to mobile app
   - Deep linking to daily summary
   - Rich notification cards

5. **Integration with Calendar**
   - Show scheduled events
   - Calculate actual time spent vs. scheduled
   - Suggest rescheduling

---

## Deployment Checklist

- [ ] All environment variables configured
- [ ] Supabase service role key added to n8n
- [ ] Gemini API key configured and tested
- [ ] Cron schedule set to 23:59 UTC
- [ ] Error handling configured
- [ ] Logging set up
- [ ] Test workflow executed successfully
- [ ] Email notifications tested (if enabled)
- [ ] Workflow activated
- [ ] Monitoring/alerting configured
- [ ] Documentation shared with team

---

## Conclusion

This n8n workflow provides a complete daily report generation pipeline that:
- ✅ Aggregates user data automatically
- ✅ Generates AI insights using Gemini
- ✅ Stores reports in Supabase
- ✅ Notifies users
- ✅ Handles errors gracefully
- ✅ Scales to multiple users

**Status:** Ready for deployment and customization

---

*Last Updated: December 2, 2025*
*Workflow Status: DOCUMENTED & READY FOR SETUP*
*Estimated Setup Time: 1-2 hours*
*Estimated Execution Time per User: 5-10 seconds*
