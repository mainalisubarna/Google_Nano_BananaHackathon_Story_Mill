import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Loader2 } from 'lucide-react'

const ProcessingSteps = ({ steps, currentStep }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mt-8 max-w-3xl mx-auto"
    >
      <h3 className="text-2xl font-semibold mb-6 text-center">Creating Your Story</h3>
      
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isPending = index > currentStep
          
          return (
            <motion.div
              key={index}
              className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 ${
                isCompleted 
                  ? 'bg-green-50 border border-green-200' 
                  : isCurrent 
                    ? 'bg-primary-50 border border-primary-200 pulse-glow' 
                    : 'bg-gray-50 border border-gray-200'
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"
                  >
                    <CheckCircle className="h-5 w-5 text-white" />
                  </motion.div>
                ) : isCurrent ? (
                  <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">{index + 1}</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h4 className={`font-semibold ${
                  isCompleted 
                    ? 'text-green-800' 
                    : isCurrent 
                      ? 'text-primary-800' 
                      : 'text-gray-600'
                }`}>
                  {step.title}
                </h4>
                <p className={`text-sm ${
                  isCompleted 
                    ? 'text-green-600' 
                    : isCurrent 
                      ? 'text-primary-600' 
                      : 'text-gray-500'
                }`}>
                  {step.description}
                </p>
              </div>
              
              {isCurrent && (
                <motion.div
                  className="flex-shrink-0"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>
      
      {/* Progress Bar */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">Progress</span>
          <span className="text-sm font-medium text-gray-600">
            {Math.round(((currentStep + 1) / steps.length) * 100)}%
          </span>
        </div>
        <div className="progress-bar">
          <motion.div
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  )
}

export default ProcessingSteps