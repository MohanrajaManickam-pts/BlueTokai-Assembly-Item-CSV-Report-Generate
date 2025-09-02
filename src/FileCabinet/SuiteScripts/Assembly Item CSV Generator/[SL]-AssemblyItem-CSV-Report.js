/**
 *
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @author Mohanraja Manickam
 * @copyright 2025 [Prateek]**
 */

define(["N/ui/serverWidget", "N/task"], function(ui, task) {
    /**
     * Description placeholder
     *
     * @param {*} context
     *  @author Mohanraja Manickam
     * @returns {any}
     */
    function onRequest(context) {
      try {
        if (context.request.method === "GET") {
          const form = ui.createForm({
            title: "Assembly Item Report",
          });
  
          form.addSubmitButton({
            label: "Generate CSV",
          });
  
         
  
          context.response.writePage(form);
        } else if (context.request.method === "POST") {
          const scriptTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: "customscript_assemblyitem_csv_report_mr",
            deploymentId: "customdeploy_assemblyitem_csv_report_mr",
          });
  
          const taskId = scriptTask.submit();
  
          // Optional: show confirmation
          const form = ui.createForm({
            title: "Assembly Item Report",
          });
  
          form.addField({
            id: "custpage_info",
            label: "Status",
            type: ui.FieldType.INLINEHTML,
          }).defaultValue = `<div style="font-size:10pt">
          <strong>CSV Generation has started.</strong><br/>
          <p style="margin-top: 5px;">
      This may take a few minutes. You will receive the file via email once it is ready.
    </p>
    <p>
      You may safely close this tab.
    </p>
        </div>`;
  
          context.response.writePage(form);
        }
      } catch (error) {
        log.error("Error in onRequest", error.message);
      }
    }
  
    return {
      onRequest: onRequest,
    };
  });