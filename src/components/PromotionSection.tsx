export default function PromotionSection() {
  return (
    <div className="mt-8 p-6 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-600 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
      <div className="text-center">
        <div className="text-4xl mb-3">🚀</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Share Your Creations!
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-2xl mx-auto">
          Built an interesting Turing machine? Have ideas for new features? I'd
          love to see your creations and hear your suggestions!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="mailto:ariel@arielcabib.com?subject=Turing Machine Creation&body=Hi Ariel!%0A%0AI've created an interesting Turing machine and wanted to share it with you.%0A%0A[Attach your machine JSON file here]%0A%0AThanks!"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            📧 Share Machine
          </a>
          <a
            href="mailto:ariel@arielcabib.com?subject=Feature Suggestion&body=Hi Ariel!%0A%0AI have an idea for a new feature for the Turing Machine Builder:%0A%0A[Describe your feature idea here]%0A%0AThanks!"
            className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors"
          >
            💡 Suggest Feature
          </a>
        </div>
      </div>
    </div>
  );
}
