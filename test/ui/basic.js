module.exports = {
  'App starts' : function (browser) {
    browser
      .url('http://localhost:3333/#/')
      .waitForElementVisible('body', 1000)
      .assert.containsText('#logo', 'queery.link')
      .end();
  },
  'Type query and test (table query)': function (browser) {
    browser
      .url('http://localhost:3333/#/')
      .waitForElementVisible('#testQuery', 2000)
      .clearValue("textarea[id=text]")
      .setValue("textarea[id=text]","select * where {  ?s ?p ?o   } limit 7")
      .click("#testQuery")
      .waitForElementVisible("#tableResults",2000)
      .assert.containsText("#tableResults tr:last-child td:first-child","7")
      .end()
  },
  'Type name, type query text and create (graph query)': function (browser) {
    browser
      .url('http://localhost:3333/#/')
      .waitForElementVisible('body', 1000)
      .setValue('input[placeholder=Name]', 'Test UI')
      .pause(100)
      .assert.valueContains("input[id=weburl]","/test-ui")
      .assert.valueContains("input[id=apiurl]","/test-ui")
      .setValue('input[id=author]', 'Tester')
      .click("input[id=graphs]")
      .clearValue("textarea[id=text]")
      .setValue("textarea[id=text]","describe ?s where { ?s ?p ?o } limit 1")
      .assert.elementPresent("#saveQuery")
      .click("#saveQuery")
      .waitForElementVisible("#edit",1500)
      .assert.urlContains("/edit/graphs/test-ui")
  },
  'Switch views': function (browser) {
    browser
      .url('http://localhost:3333/#/view/graphs/test-ui')
      .waitForElementVisible('#editButton', 1000)
      .click('#editButton')
      .assert.urlContains("/edit/graphs/test-ui")
      .waitForElementVisible('#edit', 1000)
      .assert.value("input[id=name]","Test UI")
      .assert.valueContains("input[id=weburl]","/test-ui")
      .assert.valueContains("input[id=apiurl]","/test-ui")
      .assert.value("textarea[id=text]","describe ?s where { ?s ?p ?o } limit 1")
      .click('#viewButton')
      .waitForElementVisible('#view', 1000)
      .assert.elementPresent('#queryDetails')
      .assert.urlContains("/view/graphs/test-ui")
      .assert.value("input[id=name]","Test UI")
      .assert.containsText("div[id=text]","describe ?s where { ?s ?p ?o } limit 1")
      .assert.value("input[id=author]","Tester")
      .click("#detailsButton")
      .assert.elementNotPresent('#queryDetails')
      .click('#newButton')
      .waitForElementVisible('#testQuery', 500)
      .assert.value("input[id=name]","")
  },
  'Delete query': function (browser) {
    browser
      .url('http://localhost:3333/#/view/graphs/test-ui')
      .waitForElementVisible('#deleteButton', 1000)
      .click('#deleteButton')
      .waitForElementVisible('#testQuery', 500)
      .assert.value("input[id=name]","")
      .assert.containsText("#terminal","Query deleted successfully: graphs/test-ui")
      .url('http://localhost:3333/#/view/graphs/test-ui')
      .assert.containsText("#terminal","graphs/test-ui: This query does not exist.")
      .assert.elementNotPresent("div.actions")
      .end()
  }
};
