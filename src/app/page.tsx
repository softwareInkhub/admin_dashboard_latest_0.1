import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between text-sm lg:flex">
        <div className="text-center w-full">
          <h1 className="text-4xl font-bold mb-6">AWS DynamoDB Explorer</h1>
          <p className="text-xl mb-12">
            A modern admin dashboard to explore and manage your DynamoDB tables
          </p>
          
          <div className="flex justify-center gap-4">
            <Link
              href="/admin"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Go to Admin Dashboard
            </Link>
          </div>
          
          <div className="mt-20 text-sm text-gray-500">
            <p>Before using the dashboard, make sure to update your AWS credentials in the .env.local file</p>
          </div>
        </div>
      </div>
    </main>
  );
} 