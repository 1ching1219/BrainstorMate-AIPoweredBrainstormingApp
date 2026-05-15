import random

# In a production environment, this would be replaced with a real LLM API
# like OpenAI's GPT or Anthropic's Claude API

def generate_ai_feedback(role, meeting_context=None):
    """
    Generate AI feedback based on the agent's role and meeting context.
    
    Args:
        role (str): The role of the AI agent (Designer, Engineer, Finance, Professor)
        meeting_context (dict, optional): Context from the meeting for more relevant feedback
        
    Returns:
        str: Generated feedback text
    """
    
    # Simple role-based feedback templates
    feedback_templates = {
        'Designer': [
            "From a design perspective, I think we should consider improving the user flow for better usability.",
            "The visual hierarchy could be more intuitive. Let's prioritize the most important elements.",
            "Have we considered how this design will work on mobile devices? Responsive design is crucial here.",
            "The current color scheme may present accessibility issues. We should ensure sufficient contrast ratios.",
            "I suggest we simplify the navigation to reduce cognitive load for users.",
        ],
        'Engineer': [
            "We need to consider the scalability of this solution as user adoption grows.",
            "This architecture might introduce potential bottlenecks. Let's review the performance implications.",
            "From a technical standpoint, we should implement proper error handling for edge cases.",
            "We could optimize this by implementing a caching layer to reduce redundant computations.",
            "Let's ensure our approach is maintainable long-term with proper documentation and testing.",
        ],
        'Finance': [
            "Based on our projections, this feature could increase revenue by approximately 12% in Q3.",
            "We should analyze the ROI implications before committing resources to this initiative.",
            "From a financial perspective, we need to consider both the direct and indirect costs.",
            "This investment has a potential payback period of 9 months, which aligns with our goals.",
            "We should allocate a contingency budget to manage unexpected development costs.",
        ],
        'Professor': [
            "Recent research in this field suggests that our approach should incorporate more user feedback loops.",
            "There's an interesting parallel here with the problem solving frameworks discussed in innovation theory.",
            "I'd recommend examining the case studies from similar implementations in adjacent industries.",
            "The theoretical foundation for this approach is sound, but we should validate with empirical testing.",
            "Let's apply first principles thinking to break down this complex problem into manageable components.",
        ],
        # Default feedback for any other role
        'default': [
            "I have some insights that might be helpful for our discussion.",
            "Let's consider additional factors that could influence our decision.",
            "Based on my analysis, there are several trade-offs we should evaluate.",
            "I'd suggest we gather more data before finalizing this approach.",
            "We should align on our key objectives before proceeding further.",
        ]
    }
    
    # Get the appropriate templates for the role, or use default if not found
    templates = feedback_templates.get(role, feedback_templates['default'])
    
    # Simple random selection for demo purposes
    # In a real implementation, this would use an LLM API with context
    return random.choice(templates)


def generate_ai_response(message, role):
    """
    Generate AI response to user messages based on the agent's role.
    
    Args:
        message (str): The user's message
        role (str): The role of the AI agent
        
    Returns:
        str: Generated response text
    """
    
    # Simple role-based response templates
    response_templates = {
        'Designer': [
            "That's an interesting point from a design perspective.",
            "Looking at this through a design lens, I'd suggest considering the user experience impacts.",
            "We should ensure the visual design supports the functionality you're describing.",
        ],
        'Engineer': [
            "From a technical standpoint, we should consider the implementation complexity.",
            "I'd recommend evaluating the system architecture implications of this approach.",
            "Let's think about how we can make this solution scalable and maintainable.",
        ],
        'Finance': [
            "When analyzing the financial implications, we should consider both short and long-term ROI.",
            "This approach could impact our budget forecasting for the next quarter.",
            "Let's evaluate the cost-benefit ratio before proceeding.",
        ],
        'Professor': [
            "The theoretical framework you're describing has interesting practical applications.",
            "Research in this area suggests we should consider alternative approaches as well.",
            "Let's analyze this systematically based on established methodologies.",
        ],
        # Default responses for any other role
        'default': [
            "That's a valuable contribution to our discussion.",
            "I appreciate your perspective on this matter.",
            "Let's explore that idea further in our meeting.",
        ]
    }
    
    # Get the appropriate templates for the role, or use default if not found
    templates = response_templates.get(role, response_templates['default'])
    
    # Simple random selection for demo purposes
    # In a real implementation, this would use an LLM API with context
    return random.choice(templates)
