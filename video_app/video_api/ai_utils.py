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

# # video_api/ai_utils.py

# import random
# import asyncio
# from channels.layers import get_channel_layer
# from asgiref.sync import async_to_sync
# from .models import Room, Message, RoomParticipant, AIAgent

# # 角色特定的回饋模板
# FEEDBACK_TEMPLATES = {
#     'Designer': [
#         "從使用者體驗角度來看，我們應該考慮更簡潔的介面設計。",
#         "我建議我們可以使用更一致的色彩方案，以增強品牌識別度。",
#         "根據最新的設計趨勢，我們可以嘗試使用更多的動態元素。",
#         "考慮到可訪問性，我們應該增加對比度並優化字體大小。",
#         "從設計思維的角度，我們可以進行更多的用戶訪談來驗證我們的假設。"
#     ],
#     'Engineer': [
#         "我認為我們可以通過優化後端架構來提高系統的響應速度。",
#         "從技術角度，我建議我們使用容器化技術來簡化部署流程。",
#         "根據我的分析，我們應該考慮使用異步處理來優化高並發情況。",
#         "關於代碼質量，我們可以增加單元測試覆蓋率來減少潛在的問題。",
#         "考慮到系統擴展性，我們可以使用微服務架構來分離關鍵功能。"
#     ],
#     'Finance': [
#         "根據財務報表分析，我們應該增加研發投資以保持市場競爭力。",
#         "從成本效益角度，我建議重新評估當前的定價策略。",
#         "我們的現金流預測表明，我們需要開拓新的收入來源。",
#         "考慮到投資回報率，我們應該優先考慮客戶保留而非獲取。",
#         "根據市場趨勢，我預測我們的毛利率在下一季度可能會受到壓力。"
#     ],
#     'Professor': [
#         "從理論角度，我們應該考慮更多的跨學科合作來解決這個問題。",
#         "根據最新的研究結果，我建議我們採用更系統化的方法。",
#         "歷史數據表明，我們面臨的挑戰與1990年代的市場轉型類似。",
#         "從教育的視角，我們應該考慮如何將這些知識更有效地傳遞給目標受眾。",
#         "我的研究顯示，這種方法在長期可能會帶來更可持續的結果。"
#     ]
# }

# # 通用的回饋模板（當角色特定模板不可用時）
# GENERIC_FEEDBACK = [
#     "我認為我們應該考慮更多數據來支持這個決策。",
#     "從我的角度看，這個提案有很大潛力，但需要更多細節。",
#     "我同意之前的觀點，不過我們還應該考慮其他可能性。",
#     "我建議我們制定更清晰的目標來指導這個計劃。",
#     "根據我的經驗，我們可能需要更多的資源來實現這個目標。"
# ]

# def generate_ai_feedback(room_id, ai_agent):
#     """生成AI代理的回饋"""
#     try:
#         # 獲取AI代理的角色
#         role = ai_agent.role if ai_agent else "Generic"
        
#         # 根據角色選擇適當的模板
#         templates = FEEDBACK_TEMPLATES.get(role, GENERIC_FEEDBACK)
        
#         # 隨機選擇一個回饋
#         feedback = random.choice(templates)
        
#         # 獲取房間
#         room = Room.objects.get(room_id=room_id)
        
#         # 創建消息
#         message = Message.objects.create(
#             room=room,
#             sender=f"{role}",
#             content=feedback,
#             is_ai=True
#         )
        
#         # 發送消息到WebSocket
#         channel_layer = get_channel_layer()
#         async_to_sync(channel_layer.group_send)(
#             f'chat_{room_id}',
#             {
#                 'type': 'chat_message',
#                 'message': feedback,
#                 'sender': f"{role}",
#                 'is_ai': True
#             }
#         )
        
#         return message
#     except Exception as e:
#         print(f"Error generating AI feedback: {e}")
#         return None

# async def periodic_ai_feedback(room_id):
#     """定期為房間中的AI代理生成回饋"""
#     try:
#         # 獲取房間中的所有AI代理
#         room = Room.objects.get(room_id=room_id)
#         ai_participants = RoomParticipant.objects.filter(room=room, is_ai=True)
        
#         while True:
#             # 每30-60秒隨機選擇一個AI代理生成回饋
#             await asyncio.sleep(random.randint(30, 60))
            
#             if ai_participants.exists():
#                 # 隨機選擇一個AI代理
#                 ai_participant = random.choice(list(ai_participants))
                
#                 # 生成回饋
#                 generate_ai_feedback(room_id, ai_participant.ai_agent)
#     except Exception as e:
#         print(f"Error in periodic AI feedback: {e}")

# def start_ai_feedback_loop(room_id):
#     """啟動AI回饋循環"""
#     asyncio.create_task(periodic_ai_feedback(room_id))
