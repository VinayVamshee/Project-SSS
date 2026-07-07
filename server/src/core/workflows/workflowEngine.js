// core/workflows/workflowEngine.js
const AppError = require('../error/AppError');

class WorkflowEngine {
  /**
   * Evaluates if a state transition is permitted under workflow constraints
   */
  canTransition(currentState, targetState, workflowDefinition, userRole) {
    // 1. If no workflow is configured, allow all transitions
    if (!workflowDefinition || !workflowDefinition.states) {
      return true;
    }

    // 2. Validate states exist
    if (!workflowDefinition.states.includes(currentState)) {
      throw new AppError(`Current state '${currentState}' is invalid for this workflow.`, 400);
    }
    if (!workflowDefinition.states.includes(targetState)) {
      throw new AppError(`Target state '${targetState}' is not defined in this workflow.`, 400);
    }

    // 3. Find permitted transitions
    const match = workflowDefinition.transitions?.find(t => 
      t.from === currentState && t.to === targetState
    );

    if (!match) {
      throw new AppError(`Transition from '${currentState}' to '${targetState}' is not permitted.`, 400);
    }

    // 4. Validate Role authorizations
    if (match.requiredRole && match.requiredRole !== userRole) {
      throw new AppError(`Role '${userRole}' is not authorized to transition to '${targetState}'.`, 403);
    }

    return true;
  }
}

module.exports = new WorkflowEngine();
