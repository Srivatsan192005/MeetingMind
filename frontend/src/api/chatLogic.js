/**
 * Local Chat Logic - Answer questions about meetings using meeting JSON data
 * No API calls needed - works completely offline
 */

// Keywords for different question types
const KEYWORDS = {
  action_items: ['action', 'task', 'todo', 'do', 'own', 'who', 'responsible', 'assignee', 'assigned', 'deadline', 'due'],
  decisions: ['decide', 'decision', 'approved', 'approval', 'agreed', 'agreed to', 'chose', 'rejected', 'accept', 'decline'],
  summary: ['summary', 'overview', 'what', 'happened', 'discussed', 'main', 'topic', 'covered', 'agenda'],
  assignee: ['who', 'responsible', 'own', 'assigned', 'owner', 'person'],
  deadline: ['when', 'due', 'deadline', 'date', 'time', 'by when'],
};

/**
 * Calculate relevance score based on keyword matches
 */
function getRelevanceScore(text, keywords) {
  const lowerText = text.toLowerCase();
  const matches = keywords.filter(kw => lowerText.includes(kw.toLowerCase()));
  return matches.length;
}

/**
 * Find action items matching the question
 */
function findRelevantActionItems(question, actionItems) {
  if (!actionItems || actionItems.length === 0) {
    return [];
  }

  const relevant = actionItems.filter(item => {
    if (!item || typeof item !== 'object') return false;
    
    const questionLower = question.toLowerCase();
    const descLower = (item.description || '').toLowerCase();
    const assigneeLower = (item.assignee || '').toLowerCase();
    
    // Check if question mentions this task or assignee
    return descLower && (
      questionLower.includes(descLower.substring(0, 10)) ||
      assigneeLower && questionLower.includes(assigneeLower) ||
      question.match(/\b(what|which)\b/i) // General "what tasks" questions
    );
  });

  return relevant.length > 0 ? relevant : actionItems.slice(0, 3);
}

/**
 * Find decisions matching the question
 */
function findRelevantDecisions(question, decisions) {
  if (!decisions || decisions.length === 0) {
    return [];
  }

  const questionLower = question.toLowerCase();
  const relevant = decisions.filter(decision => {
    if (!decision || typeof decision !== 'string') return false;
    const decisionLower = decision.toLowerCase();
    
    // Check for keyword overlap
    return questionLower.split(' ').some(word => 
      word.length > 3 && decisionLower.includes(word.toLowerCase())
    );
  });

  return relevant.length > 0 ? relevant : decisions.slice(0, 2);
}

/**
 * Format action items for display
 */
function formatActionItems(items) {
  if (!items || items.length === 0) {
    return 'No action items found.';
  }

  return items
    .map((item, idx) => {
      const desc = item.description || 'Unspecified task';
      const assignee = item.assignee ? ` (${item.assignee})` : ' (Unassigned)';
      const deadline = item.deadline ? ` — due ${item.deadline}` : '';
      return `${idx + 1}. ${desc}${assignee}${deadline}`;
    })
    .join('\n');
}

/**
 * Determine question type and generate appropriate response
 */
export function generateLocalResponse(question, meeting) {
  if (!meeting || typeof question !== 'string') {
    return 'I need a valid meeting and question to answer.';
  }

  const questionLower = question.toLowerCase();
  
  // Extract data
  const title = meeting.title || 'Untitled Meeting';
  const summary = meeting.result?.summary || '';
  const actionItems = meeting.result?.action_items || [];
  const decisions = meeting.result?.decisions || [];

  // Detect question type and provide targeted response
  
  // Action items questions
  if (getRelevanceScore(questionLower, KEYWORDS.action_items) >= 1) {
    const relevant = findRelevantActionItems(question, actionItems);
    if (relevant.length > 0) {
      return `Action items:\n\n${formatActionItems(relevant)}`;
    }
  }

  // Decision questions
  if (getRelevanceScore(questionLower, KEYWORDS.decisions) >= 1) {
    const relevant = findRelevantDecisions(question, decisions);
    if (relevant.length > 0) {
      return relevant.map((d, i) => `• ${d}`).join('\n');
    }
  }

  // Who is responsible / Assignee questions
  if (getRelevanceScore(questionLower, KEYWORDS.assignee) >= 1) {
    const relevant = findRelevantActionItems(question, actionItems);
    const withAssignee = relevant.filter(item => item.assignee);
    if (withAssignee.length > 0) {
      return withAssignee
        .map(item => `${item.assignee}: ${item.description}`)
        .join('\n');
    }
  }

  // Deadline / When questions
  if (getRelevanceScore(questionLower, KEYWORDS.deadline) >= 1) {
    const withDeadline = actionItems.filter(item => item.deadline);
    if (withDeadline.length > 0) {
      return withDeadline
        .map(item => `${item.description}: due ${item.deadline}`)
        .join('\n');
    }
  }

  // Summary / Overview questions
  if (getRelevanceScore(questionLower, KEYWORDS.summary) >= 1) {
    return `Meeting: ${title}\n\n${summary}`;
  }

  // Default: search all content
  const allText = `${title} ${summary} ${actionItems.map(a => a.description).join(' ')} ${decisions.join(' ')}`.toLowerCase();
  const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const matchedWords = questionWords.filter(w => allText.includes(w));

  if (matchedWords.length > 0) {
    // Found matching content - return relevant data
    const relevant = findRelevantActionItems(question, actionItems);
    if (relevant.length > 0) {
      return `Based on the meeting:\n\n${formatActionItems(relevant)}`;
    }
    return `Meeting Summary:\n${summary}`;
  }

  // No matches found
  return `I couldn't find information about "${question}" in the meeting notes. Try asking about action items, decisions, or the meeting summary.`;
}

/**
 * Check if response should use local logic (no API needed)
 */
export function shouldUseLocalLogic(question) {
  const score = getRelevanceScore(
    question.toLowerCase(),
    Object.values(KEYWORDS).flat()
  );
  // Use local logic if score is >= 1
  return score >= 1;
}
