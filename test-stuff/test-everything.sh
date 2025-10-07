#!/bin/bash

# 🚀 One-Command API Testing Script
# Tests everything to ensure your unified request system works seamlessly

echo "🚀 Starting Complete API Testing..."
echo "=================================="

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Check if server is running
echo -e "${BLUE}📡 Checking if server is running...${NC}"
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${YELLOW}⚠️  Server not responding on port 3000${NC}"
    echo -e "${BLUE}🔄 Trying to start server...${NC}"
    
    # Try to start server in background
    npm run start:dev > server.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start
    echo -e "${BLUE}⏳ Waiting for server to start...${NC}"
    sleep 10
    
    # Check again
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server started successfully${NC}"
    else
        echo -e "${RED}❌ Could not start server. Please start manually with 'npm run start:dev'${NC}"
        exit 1
    fi
fi

# Install dependencies if needed
echo -e "${BLUE}📦 Checking dependencies...${NC}"
if ! npm list axios > /dev/null 2>&1; then
    echo -e "${YELLOW}📦 Installing required dependencies...${NC}"
    npm install axios colors
fi

# Run the comprehensive API tests
echo -e "${BLUE}🧪 Running comprehensive API tests...${NC}"
echo "=================================="

node test-apis-now.js

# Capture exit code
TEST_EXIT_CODE=$?

# Cleanup
if [ ! -z "$SERVER_PID" ]; then
    echo -e "${BLUE}🧹 Cleaning up...${NC}"
    kill $SERVER_PID 2>/dev/null
fi

# Final result
echo "=================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! Your unified request system is working perfectly!${NC}"
    echo -e "${GREEN}✅ Authentication works${NC}"
    echo -e "${GREEN}✅ All request types can be created${NC}"
    echo -e "${GREEN}✅ Manager workflows function${NC}"
    echo -e "${GREEN}✅ Statistics are generated${NC}"
    echo -e "${GREEN}✅ Error handling is robust${NC}"
else
    echo -e "${RED}❌ Some tests failed. Check the output above for details.${NC}"
    echo -e "${YELLOW}💡 Common fixes:${NC}"
    echo -e "${YELLOW}   - Ensure database is running${NC}"
    echo -e "${YELLOW}   - Run database migrations${NC}"
    echo -e "${YELLOW}   - Check server logs for errors${NC}"
fi

exit $TEST_EXIT_CODE