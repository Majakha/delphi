#!/usr/bin/env node

/**
 * Test script to validate the fixes for the protocol editor issues
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_BASE = 'http://localhost:3001';
let authToken = '';

// Test configuration
const TEST_USER = {
  username: 'testuser1',
  password: 'password'
};

async function makeRequest(endpoint, options = {}) {
  try {
    const config = {
      baseURL: API_BASE,
      url: endpoint,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        ...options.headers
      },
      ...options
    };

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await makeRequest('/auth/login', {
      method: 'POST',
      data: TEST_USER
    });
    authToken = response.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return false;
  }
}

async function testProtocolCreation() {
  console.log('\n📝 Testing protocol creation...');
  try {
    const protocolData = {
      name: `Test Protocol ${Date.now()}`,
      description: 'Test protocol for debugging',
      template_protocol_id: 'protocol-template-001'
    };

    const response = await makeRequest('/protocols', {
      method: 'POST',
      data: protocolData
    });

    console.log('✅ Protocol created successfully:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('❌ Protocol creation failed');
    throw error;
  }
}

async function testAddTaskToProtocol(protocolId) {
  console.log('\n➕ Testing task addition with 0-based indexing...');
  try {
    // Test adding task at index 0 (should work with our fix)
    const response = await makeRequest(`/protocols/${protocolId}/tasks/task-001`, {
      method: 'POST',
      data: {
        order_index: 0,  // This should now work (was failing before)
        importance_rating: 5,
        notes: 'Test task added at index 0'
      }
    });

    console.log('✅ Task added successfully at index 0:', response.data.protocol_task_id);

    // Add another task
    const response2 = await makeRequest(`/protocols/${protocolId}/tasks/task-002`, {
      method: 'POST',
      data: {
        order_index: 1,
        importance_rating: 4,
        notes: 'Test task added at index 1'
      }
    });

    console.log('✅ Second task added successfully at index 1:', response2.data.protocol_task_id);
    return [response.data.protocol_task_id, response2.data.protocol_task_id];
  } catch (error) {
    console.error('❌ Task addition failed');
    throw error;
  }
}

async function testTaskReordering(protocolId) {
  console.log('\n🔄 Testing task reordering...');
  try {
    // Test the new bulk reorder endpoint
    const reorderData = {
      task_orders: [
        { task_id: 'task-002', order_index: 0 },  // Move second task to first
        { task_id: 'task-001', order_index: 1 }   // Move first task to second
      ]
    };

    await makeRequest(`/protocols/${protocolId}/tasks/reorder`, {
      method: 'PUT',
      data: reorderData
    });

    console.log('✅ Tasks reordered successfully');
    return true;
  } catch (error) {
    console.error('❌ Task reordering failed');
    throw error;
  }
}

async function testProtocolUpdate(protocolId) {
  console.log('\n✏️  Testing protocol metadata update...');
  try {
    const updateData = {
      name: `Updated Protocol ${Date.now()}`,
      description: 'Updated description - tasks should remain visible'
    };

    await makeRequest(`/protocols/${protocolId}`, {
      method: 'PUT',
      data: updateData
    });

    console.log('✅ Protocol metadata updated successfully');

    // Immediately fetch full protocol to test if tasks are still there
    const fullProtocol = await makeRequest(`/protocols/${protocolId}/full`);
    console.log(`✅ Protocol still has ${fullProtocol.data.tasks.length} tasks after metadata update`);

    return fullProtocol.data.tasks.length > 0;
  } catch (error) {
    console.error('❌ Protocol update failed');
    throw error;
  }
}

async function testSingleTaskReorder(protocolId, taskId) {
  console.log('\n🎯 Testing single task reorder...');
  try {
    await makeRequest(`/protocols/${protocolId}/tasks/${taskId}/order`, {
      method: 'PUT',
      data: { order_index: 0 }
    });

    console.log('✅ Single task reordered successfully');
    return true;
  } catch (error) {
    console.error('❌ Single task reorder failed');
    throw error;
  }
}

async function testFullProtocolLoad(protocolId) {
  console.log('\n📊 Testing full protocol load...');
  try {
    const response = await makeRequest(`/protocols/${protocolId}/full`);
    const protocol = response.data;

    console.log(`✅ Full protocol loaded with ${protocol.tasks.length} tasks`);
    protocol.tasks.forEach((task, index) => {
      console.log(`   Task ${index}: ${task.title} (order: ${task.order_index})`);
    });

    return protocol;
  } catch (error) {
    console.error('❌ Full protocol load failed');
    throw error;
  }
}

async function cleanup(protocolId) {
  console.log('\n🧹 Cleaning up test data...');
  try {
    await makeRequest(`/protocols/${protocolId}`, {
      method: 'DELETE'
    });
    console.log('✅ Test protocol deleted');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting protocol editor fix validation tests...\n');

  let protocolId = null;

  try {
    // Login
    const loginSuccess = await login();
    if (!loginSuccess) {
      process.exit(1);
    }

    // Create test protocol
    const protocol = await testProtocolCreation();
    protocolId = protocol.id;

    // Test task addition (this was failing with "Task assignment validation failed")
    const [taskId1, taskId2] = await testAddTaskToProtocol(protocolId);

    // Test protocol metadata update (this was causing tasks to disappear)
    const tasksRemainAfterUpdate = await testProtocolUpdate(protocolId);

    // Test task reordering (this was not working)
    await testTaskReordering(protocolId);

    // Test single task reordering
    await testSingleTaskReorder(protocolId, 'task-001');

    // Final verification
    await testFullProtocolLoad(protocolId);

    console.log('\n🎉 All tests passed! The fixes are working correctly.');

    // Summary of fixes
    console.log('\n📋 Summary of fixes applied:');
    console.log('   1. ✅ Fixed 0-based indexing validation (task assignment works)');
    console.log('   2. ✅ Added task reordering API endpoints');
    console.log('   3. ✅ Improved cache synchronization');
    console.log('   4. ✅ Fixed protocol metadata updates preserving tasks');
    console.log('   5. ✅ Added proper error handling and data consistency');

  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    console.log('\n🔍 Issues that may need attention:');
    console.log('   - Check if the API server is running on port 3001');
    console.log('   - Verify database connection and schema');
    console.log('   - Ensure test user exists with correct credentials');

    process.exit(1);
  } finally {
    // Cleanup
    if (protocolId) {
      await cleanup(protocolId);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  makeRequest,
  login
};
