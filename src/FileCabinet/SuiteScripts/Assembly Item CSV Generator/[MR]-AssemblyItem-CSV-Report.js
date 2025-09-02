/**
 *
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 * @author Mohnarja Manickam
 * @copyright 2025 [Prateek]**
 */

define([
  "N/search",
  "N/email",
  "N/runtime",
  "N/file",
  "N/record",
  
  
 
], function (search, email, runtime, file, record) {
  /**
   * Description placeholder
   *
   * @returns {{Object}}
   * @author Mohnarja Manickam
   */
  function getInputData() {
    const assemblyItemSearchObj = {
      type: search.Type.ITEM,
      filters: [["type", "anyof", "Assembly"]],
      columns: ["internalid", "name"],
    };

    const assemblyItemSearchResultArray = getSearch(
      assemblyItemSearchObj.type,
      assemblyItemSearchObj.filters,
      assemblyItemSearchObj.columns
    );

    //log.debug("assemblyItemSearchResultArray_getInputData", assemblyItemSearchResultArray);

    log.debug("Total_Assembly_count", assemblyItemSearchResultArray.length);

    return assemblyItemSearchResultArray;
  }

  /**
   * Description placeholder
   *
   * @param {*} context
   * @author Mohnarja Manickam
   */
  function map(context) {
    try {
      const itemData = JSON.parse(context.value);
      // log.debug("itemData",itemData)
      const itemId = itemData.id;
      const itemName = itemData.name;

      // Load BOMs related to this item
      const bomSearch = search.create({
        type: "assemblyitem",
        filters: [
          ["type", "anyof", "Assembly"],
          "AND",
          ["internalid", "anyof", itemId],
        ],
        columns: [
          {
            name: "billofmaterials",
            join: "assemblyItemBillOfMaterials",
          },
          {
            name: "billofmaterialsid",
            join: "assemblyItemBillOfMaterials",
          },
        ],
      });

      bomSearch.run().each((bomResult) => {
        //log.debug("bomResult",bomResult);

        const bomId = bomResult.getValue({
          name: "billofmaterialsid",
          join: "assemblyItemBillOfMaterials",
        });

        const bomName = bomResult.getText({
          name: "billofmaterials",
          join: "assemblyItemBillOfMaterials",
        });
        context.write({
          key: itemId,
          value: {
            itemId: itemId,
            itemName: itemName,
            bomId: bomId,
            bomName: bomName,
          },
        });
        return true;
      });
    } catch (error) {
      log.error("Error in Map", error.message);
    }
  }

  /**
   * Description placeholder
   *
   * @param {string} context
   * @author Mohnarja Manickam
   */
  function reduce(context) {
    try {
      const components = [];

      context.values.forEach((value) => {
        const bomData = JSON.parse(value);
        const { itemId, itemName, bomId, bomName } = bomData;

        const bomRevisionSearch = search.create({
          type: "bom",
          filters: [["internalid", "anyof", bomId]],
          columns: [
            "revisionname",
            {
              name: "internalid",
              join: "revision",
            },
          ],
        });

        var revisionId;
        bomRevisionSearch.run().each((result) => {
          //log.debug("result_bomRevisionSearch",result)
          revisionId = result.getValue({
            name: "internalid",
            join: "revision",
          });

          revisionName = result.getValue("revisionname");
          return false;
        });

        // log.debug("Revision Id", revisionId);
        if (!revisionId) return;
        const componentsSearchObj = {
          type: "bomrevision",
          filters: [["internalid", "anyof", revisionId]],
          columns: [
            search.createColumn({
              name: "componentyield",
              join: "component",
            }),
            search.createColumn({
              name: "item",
              join: "component",
            }),
            search.createColumn({
              name: "bomquantity",
              join: "component",
            }),
            search.createColumn({
              name: "quantity",
              join: "component",
            }),
            search.createColumn({
              name: "units",
              join: "component",
            }),
            search.createColumn({
              name: "description",
              join: "component",
            }),
          ],
        };

        const componentsSearchArray = getSearch(
          componentsSearchObj.type,
          componentsSearchObj.filters,
          componentsSearchObj.columns
        );

        // log.debug("componentsSearchArray", componentsSearchArray);

        //   {
        //     id: "6445",
        //     component_componentyield: "100",
        //     component_item: "1001528",
        //     component_item_txt: "RC/PSL5/1R22/SE : RP/PSL5/1R22/SE/35g/WB",
        //     component_bomquantity: "1",
        //     component_quantity: "1",
        //     component_units: "Number",
        //     component_description: ""
        //  }

        for (var i = 0; i < componentsSearchArray.length; i++) {
          const componentId = componentsSearchArray[i].component_item;
          const componentText = componentsSearchArray[i].component_description;
          const componentYield =
            componentsSearchArray[i].component_componentyield;
          const componentBomQuantity =
            componentsSearchArray[i].component_bomquantity;
          const componentQuantity = componentsSearchArray[i].component_quantity;
          const componentUnits = componentsSearchArray[i].component_units;

          components.push({
            Assembly: itemName,
            "Internal Id":itemId,
            Status: "Active",
            "Bill of Materials": bomName,
            "Bill of Materials Revision": revisionName,
            "Effective Date": "",
            "Component Id": componentId,
            "Component Text & Display Name": componentText,
            Level: "1",
            "Component Yield": componentYield,
            "Component Bom Qty": componentBomQuantity,
            "Component Qty": componentQuantity,
            "Component Unit": componentUnits,
            Location: "",
          });
        }
      });

      //log.debug("Final Componet", components);

      context.write({
        key: context.key,
        value: components,
      });
    } catch (error) {
      log.error("Error in reduce", error.message);
    }
  }

  /**
   * Description placeholder
   *
   * @param {*} summary
   * @author Mohnarja Manickam
   */
  function summarize(summary) {
    try {
      //   [
      //     {
      //        Assembly: "RC/PSL5/1R22/SE : RP/PSL5/1R22/SE/35g/AE",
      //        Status: "Active",
      //        "Bill of Materials": "RP/PSL5/1R22/SE/35g/AE/BOM",
      //        "Bill of Materials Revision": "RP/PSL5/1R22/SE/35g/AE/BOM/Revision",
      //        "Effective Date": "",
      //        "Component Id": "253526",
      //        "Component Text & Display Name": "Brewing Guide | Aeropress",
      //        Level: "1",
      //        "Component Yield": "100",
      //        "Component Bom Qty": "1",
      //        "Component Qty": "1",
      //        "Component Unit": "Number",
      //        Location: ""
      //     },
      //     {
      //        Assembly: "RC/PSL5/1R22/SE : RP/PSL5/1R22/SE/35g/AE",
      //        Status: "Active",
      //        "Bill of Materials": "RP/PSL5/1R22/SE/35g/AE/BOM",
      //        "Bill of Materials Revision": "RP/PSL5/1R22/SE/35g/AE/BOM/Revision",
      //        "Effective Date": "",
      //        "Component Id": "1001528",
      //        "Component Text & Display Name": "",
      //        Level: "1",
      //        "Component Yield": "100",
      //        "Component Bom Qty": "1",
      //        "Component Qty": "1",
      //        "Component Unit": "Number",
      //        Location: ""
      //     }
      //  ]
      const CSV_HEADERS = [
        "Assembly",
        "Internal Id",
        "Status",
        "Bill of Materials",
        "Bill of Materials Revision",
        "Effective Date",
        "Component Id",
        "Component Text & Display Name",
        "Level",
        "Component Yield",
        "Component Bom Qty",
        "Component Qty",
        "Component Unit",
        "Location",
      ];
      const allRows = [CSV_HEADERS.join(",")];

      summary.output.iterator().each(function (key, value) {
        const rows = JSON.parse(value); // rows is an array of objects
        //log.debug("rows", rows);

        rows.forEach((rowObj) => {
          const row = CSV_HEADERS.map((header) => `"${rowObj[header] || ""}"`);
          allRows.push(row.join(","));
        });

        return true;
      });

      const csvContent = allRows.join("\n");

      const csvFile = file.create({
        name: "AssemblyItem_Report.csv",
        fileType: file.Type.CSV,
        contents: csvContent,
        folder: 1635156,
      });

      const fileId = csvFile.save();

      log.debug("runtime.getCurrentUser().id", runtime.getCurrentUser().id);

      const employeeId = runtime.getCurrentUser().id;

      const emailAddress = search.lookupFields({
        type: "employee",
        id: employeeId,
        columns: "email",
      });

      log.debug("email", emailAddress.email);

      const recipient = emailAddress.email;

      email.send({
        author: employeeId,
        recipients: recipient,
        subject: "BOM Report - Assembly Items",
        body: "Please find the attached BOM report for all Assembly Items in the system.",
        attachments: [csvFile],
      });
    } catch (error) {
      log.error("Error in summary", error.message);
    }
  }

  
    /**
     * Description placeholder
     *
     * @param {*} type
     * @param {*} filters
     * @param {*} columns
     * @returns {{}}
     * @author sathish.a@prateektechnosoft.com
     */
    function getSearch(type, filters, columns) {
      try {
          var dynamicSearch
          if (typeof type === "string" || type instanceof String) {
              dynamicSearch = search.create({
                  type: type,
                  filters: filters,
                  columns: columns
              });

          } else {
              dynamicSearch = type
              columns = JSON.parse(JSON.stringify(dynamicSearch)).columns
          }

          var resultOut = [];
          var myPagedData = dynamicSearch.runPaged({ pageSize: 1000 });
          myPagedData.pageRanges.forEach(function (pageRange) {
              var myPage = myPagedData.fetch({
                  index: pageRange.index
              });
              myPage.data.forEach(function (res) {
                  var values = {
                      id: res.id

                  };
                  //iterate over the collection of columns for the value
                  columns.forEach(function (c, i) {

                      var keyName = "";

                      if (c.join)
                          keyName = c.join + "_" + c.name
                      else if (c.name.indexOf("formula") > -1)
                          keyName = c.name + "_" + i
                      else
                          keyName = c.name;

                      var value = res.getText(c);

                      if (value == null) {
                          values[keyName] = res.getValue(c);
                      } else {

                          values[keyName] = res.getValue(c);

                          values[keyName + "_txt"] = res.getText(c);
                      }
                  });
                  resultOut.push(values);
              });
          });
          return resultOut;
      }
      catch (e) {
          log.error("getSearch failed due to an exception", e);
      }
  }


  return {
    getInputData: getInputData,
    map: map,
    reduce: reduce,
    summarize: summarize,
  };
});
