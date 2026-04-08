/**
 * usePipeline — re-exported from PipelineContext for backward compatibility.
 *
 * The SSE connection is now a singleton managed by <PipelineProvider> in main.jsx.
 * All components that import usePipeline() share the same connection.
 */
export { usePipeline } from '../context/PipelineContext';
