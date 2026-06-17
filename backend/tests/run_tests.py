import sys
import os
import unittest

def run_suite():
    # Insert parent directory to system path
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    
    # Discover tests inside backend/tests folder
    test_dir = os.path.dirname(__file__)
    loader = unittest.TestLoader()
    suite = loader.discover(start_dir=test_dir, pattern='test_*.py')
    
    print("==========================================================")
    print("[START] Running Backend Unit & Integration Tests Suite...")
    print("==========================================================")
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Exit with code 0 if all tests passed, 1 otherwise
    if not result.wasSuccessful():
        print("\n[FAIL] Some tests failed. Exiting with failure status code 1.")
        sys.exit(1)
    else:
        print("\n[PASS] All unit and integration tests passed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    run_suite()
